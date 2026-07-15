import openNextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

const worker = {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/game-state") {
      return handleGameState(request, env);
    }
    if (url.pathname === "/api/game-action") {
      return handleGameAction(request, env);
    }
    if (url.pathname === "/api/me") {
      if (hasSupabaseAuthCookie(request, env)) return openNextWorker.fetch(request, env, ctx);
      return handleMe(request, env);
    }
    if (url.pathname === "/api/search") {
      return handleSearch(request, env, ctx);
    }
    if (url.pathname === "/rastgele") {
      return handleRandomGame(request, env);
    }
    if (url.pathname.startsWith("/admin") && isPrefetchRequest(request, url)) {
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    return openNextWorker.fetch(request, env, ctx);
  },

  scheduled(event) {
    console.log("[ai-translation] cron.disabled", { cron: event.cron });
  },
};

export default worker;

const privateJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store",
};

async function handleGameState(request, env) {
  const url = new URL(request.url);
  const gameId = url.searchParams.get("gameId") || "";
  if (!isUuid(gameId)) return gameStateResponse();

  const sessionId = readCookie(request.headers.get("cookie") || "", "mini_game_session");
  const profile = await getProfileForRequest(request, env);
  if (!sessionId && !profile?.id) return gameStateResponse({ isFavorite: false, userVote: null, isLoggedIn: Boolean(profile?.id) });

  try {
    const favoritePath = profile?.id
      ? `/rest/v1/favorites?select=game_id&game_id=eq.${encodeURIComponent(gameId)}&user_id=eq.${encodeURIComponent(profile.id)}&limit=1`
      : `/rest/v1/session_favorites?select=id&game_id=eq.${encodeURIComponent(gameId)}&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`;
    const [favorite, vote] = await Promise.all([
      supabaseRest(env, favoritePath),
      sessionId ? supabaseRest(env, `/rest/v1/game_reactions?select=vote&game_id=eq.${encodeURIComponent(gameId)}&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`) : Promise.resolve([]),
    ]);
    return gameStateResponse({
      isFavorite: Array.isArray(favorite) && favorite.length > 0,
      userVote: Array.isArray(vote) && typeof vote[0]?.vote === "string" ? vote[0].vote : null,
      isLoggedIn: Boolean(profile?.id),
    });
  } catch (error) {
    console.error("[game-state] edge fallback", { error: error instanceof Error ? error.message : String(error) });
    return gameStateResponse();
  }
}

async function handleGameAction(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405 });

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Geçersiz istek." }, { status: 400 });
  }

  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  if (!isUuid(gameId)) return jsonResponse({ error: "Oyun bilgisi eksik." }, { status: 400 });

  const session = getOrCreateGameSession(request);
  const profile = await getProfileForRequest(request, env);

  try {
    if (body?.action === "favorite") {
      const desired = Boolean(body.desired);
      const result = await supabaseRpc(env, "set_favorite_atomic", {
        p_game_id: gameId,
        p_profile_id: profile?.id || null,
        p_session_id: profile?.id ? null : session.id,
        p_desired: desired,
      });

      return jsonResponse(
        {
          ok: true,
          isFavorite: Boolean(result),
          isLoggedIn: Boolean(profile?.id),
        },
        { setCookie: session.setCookie },
      );
    }

    if (body?.action === "vote") {
      const vote = body.vote === "dislike" ? "dislike" : body.vote === "like" ? "like" : "";
      if (!vote) return jsonResponse({ error: "Oy bilgisi eksik." }, { status: 400, setCookie: session.setCookie });
      const stats = await supabaseRpc(env, "upsert_game_vote_atomic", {
        p_game_id: gameId,
        p_session_id: session.id,
        p_vote: vote,
      });

      return jsonResponse(
        {
          ok: true,
          userVote: vote,
          likesCount: Number(stats?.likesCount ?? 0),
          dislikesCount: Number(stats?.dislikesCount ?? 0),
          isLoggedIn: Boolean(profile?.id),
        },
        { setCookie: session.setCookie },
      );
    }

    return jsonResponse({ error: "Geçersiz işlem." }, { status: 400, setCookie: session.setCookie });
  } catch (error) {
    console.error("[game-action] edge fallback", { error: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "İşlem tamamlanamadı." }, { status: 500, setCookie: session.setCookie });
  }
}

async function handleMe(request, env) {
  const profile = await getProfileForRequest(request, env);
  return meResponse(profile ? {
    username: profile.username,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    role: profile.role,
  } : null);
}

async function handleSearch(request, env, ctx) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    "x-edge-handler": "search-rpc",
  };

  if (query.length < 3) return new Response(JSON.stringify({ items: [] }), { headers });

  const cache = caches.default;
  const normalizedQuery = query.toLocaleLowerCase("tr");
  const cacheKey = new Request(`${url.origin}${url.pathname}?q=${encodeURIComponent(normalizedQuery)}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const subjectHash = await hashSearchSubject(request, env);
    const rateResult = await supabaseRpc(env, "consume_rate_limit", {
      p_action: "search-ip",
      p_subject_hash: subjectHash,
      p_limit: 90,
      p_window_seconds: 60,
    });
    const rate = Array.isArray(rateResult) ? rateResult[0] : rateResult;
    if (!rate?.allowed) {
      return new Response(JSON.stringify({ error: "Çok fazla arama yapıldı." }), {
        status: 429,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "private, no-store",
          "retry-after": String(Math.max(1, Number(rate?.retry_after_seconds || 60))),
        },
      });
    }

    const result = await supabaseRpc(env, "search_published_games", {
      p_query: query,
      p_limit: 6,
      p_offset: 0,
    });
    const items = Array.isArray(result?.items) ? result.items.map(mapSearchSuggestion) : [];
    const response = new Response(JSON.stringify({ items }), { headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("[search] edge RPC failed", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Arama şu anda kullanılamıyor." }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
    });
  }
}

async function hashSearchSubject(request, env) {
  const ip = (request.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 128);
  const secret = env.ABUSE_HASH_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  const bytes = new TextEncoder().encode(`${secret}:${ip.toLocaleLowerCase("en-US")}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getProfileForRequest(request, env) {
  const token = getSupabaseAccessToken(request.headers.get("cookie") || "", env);
  if (!token) return null;

  try {
    const userResponse = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      signal: AbortSignal.timeout(1800),
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${token}`,
      },
    });
    if (!userResponse.ok) return null;

    const user = await userResponse.json();
    const userId = typeof user?.id === "string" ? user.id : "";
    const email = typeof user?.email === "string" ? user.email : "";
    if (!isUuid(userId)) return null;

    const profiles = await supabaseRest(
      env,
      `/rest/v1/profiles?select=id,username,avatar_url,first_name,last_name,display_name,role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    );
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile || profile.status === "blocked") return null;

    return {
      id: typeof profile.id === "string" ? profile.id : "",
      username: typeof profile.username === "string" ? profile.username : "",
      email,
      avatarUrl: normalizeSiteAssetUrl(profile.avatar_url),
      firstName: typeof profile.first_name === "string" ? profile.first_name : null,
      lastName: typeof profile.last_name === "string" ? profile.last_name : null,
      displayName: typeof profile.display_name === "string" ? profile.display_name : null,
      role: profile.role === "admin" ? "admin" : "member",
    };
  } catch (error) {
    console.error("[profile] edge fallback", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function meResponse(profile) {
  return new Response(JSON.stringify({ profile }), { headers: privateJsonHeaders });
}

function gameStateResponse(value = { isFavorite: false, userVote: null, isLoggedIn: false }) {
  return new Response(JSON.stringify(value), { headers: privateJsonHeaders });
}

async function handleRandomGame(request, env) {
  try {
    const countResponse = await supabaseRest(env, "/rest/v1/games?select=slug&status=eq.published", {
      method: "HEAD",
      headers: { Prefer: "count=exact" },
    });
    const count = Number.parseInt(String(countResponse.headers.get("content-range") || "").split("/")[1] || "0", 10);
    if (!count) return Response.redirect(publicUrl(request, "/"), 302);

    const offset = Math.floor(Math.random() * count);
    const games = await supabaseRest(env, `/rest/v1/games?select=slug&status=eq.published&limit=1&offset=${offset}`);
    const slug = Array.isArray(games) && typeof games[0]?.slug === "string" ? games[0].slug : "";
    return Response.redirect(publicUrl(request, slug ? `/oyun/${slug}` : "/"), 302);
  } catch (error) {
    console.error("[random-game] edge fallback", { error: error instanceof Error ? error.message : String(error) });
    return Response.redirect(publicUrl(request, "/"), 302);
  }
}

async function supabaseRest(env, path, init = {}) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env eksik.");
  const response = await fetch(`${url}${path}`, {
    ...init,
    signal: AbortSignal.timeout(1800),
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}`);
  if (init.method === "HEAD") return response;
  return response.json();
}

async function supabaseRpc(env, name, body) {
  return supabaseRest(env, `/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function jsonResponse(value, options = {}) {
  const headers = new Headers(privateJsonHeaders);
  if (options.setCookie) headers.set("set-cookie", options.setCookie);
  return new Response(JSON.stringify(value), { status: options.status || 200, headers });
}

function getOrCreateGameSession(request) {
  const existing = readCookie(request.headers.get("cookie") || "", "mini_game_session");
  if (existing) return { id: existing, setCookie: "" };
  const id = crypto.randomUUID();
  return {
    id,
    setCookie: `mini_game_session=${id}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`,
  };
}

function readCookie(cookieHeader, name) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

function readCookieMap(cookieHeader) {
  const cookies = new Map();
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName && rawValue.length) cookies.set(rawName, rawValue.join("="));
  }
  return cookies;
}

function getSupabaseAccessToken(cookieHeader, env) {
  const ref = getSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL || "");
  if (!ref) return "";

  const cookies = readCookieMap(cookieHeader);
  const baseName = `sb-${ref}-auth-token`;
  const direct = cookies.get(baseName);
  const value = direct || Array.from(cookies.entries())
    .filter(([name]) => name.startsWith(`${baseName}.`))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, chunk]) => chunk)
    .join("");

  return parseSupabaseAuthCookie(value);
}

function hasSupabaseAuthCookie(request, env) {
  const ref = getSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL || "");
  if (!ref) return false;
  return request.headers.get("cookie")?.includes(`sb-${ref}-auth-token`) ?? false;
}

function parseSupabaseAuthCookie(value) {
  if (!value) return "";
  let decoded = "";
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  if (decoded.startsWith("base64-")) {
    decoded = decodeBase64Url(decoded.slice("base64-".length));
  }

  try {
    const session = JSON.parse(decoded);
    if (typeof session?.access_token === "string") return session.access_token;
    if (Array.isArray(session) && typeof session[0] === "string") return session[0];
  } catch {
    return "";
  }

  return "";
}

function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function getSupabaseProjectRef(url) {
  try {
    return new URL(url).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function normalizeSiteAssetUrl(value) {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("/site-assets/")) return value;
  if (value.startsWith("site-assets/")) return `/${value}`;
  return value;
}

function publicUrl(request, pathname) {
  const url = new URL(pathname, request.url);
  url.protocol = "https:";
  return url;
}

function isPrefetchRequest(request, url) {
  return request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    (url.searchParams.has("_rsc") && request.headers.get("purpose") === "prefetch");
}

function mapSearchSuggestion(game) {
  return {
    id: typeof game.id === "string" ? game.id : "",
    title: typeof game.title === "string" ? game.title : "",
    slug: typeof game.slug === "string" ? game.slug : "",
    thumbnailUrl: normalizeGameThumbnail(game.thumbnail_url),
    shortDescription: typeof game.short_description === "string" ? game.short_description : "",
  };
}

function normalizeGameThumbnail(value) {
  if (typeof value === "string" && value) return value;
  return "/thumbnails/space.svg";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Kept for a future manual re-enable; scheduled invocations are disabled in the handler above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function runAiTranslationCron(event, env, ctx) {
  const secret = env.AI_TRANSLATION_CRON_SECRET;
  if (!secret) {
    console.warn("[ai-translation] cron.skip", { reason: "AI_TRANSLATION_CRON_SECRET eksik", cron: event.cron });
    return;
  }

  const siteUrl = env.SITE_URL || "https://boloyun.com";
  const url = new URL("/api/admin/ai/automation", siteUrl);
  let response;
  try {
    response = await openNextWorker.fetch(new Request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "cron",
        cron: event.cron,
        scheduledTime: event.scheduledTime,
      }),
    }), env, ctx);
  } catch (error) {
    console.error("[ai-translation] cron.exception", { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ai-translation] cron.failed", { status: response.status, body: body.slice(0, 500) });
  }
}
