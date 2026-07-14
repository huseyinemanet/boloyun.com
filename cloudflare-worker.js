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
    if (url.pathname === "/api/me") {
      return handleMe(request, env);
    }
    if (url.pathname === "/rastgele") {
      return handleRandomGame(request, env);
    }
    return openNextWorker.fetch(request, env, ctx);
  },

  scheduled(event, env, ctx) {
    ctx.waitUntil(runAiTranslationCron(event, env, ctx));
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
  if (!sessionId) return gameStateResponse();

  try {
    const [favorite, vote] = await Promise.all([
      supabaseRest(env, `/rest/v1/session_favorites?select=id&game_id=eq.${encodeURIComponent(gameId)}&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`),
      supabaseRest(env, `/rest/v1/game_reactions?select=vote&game_id=eq.${encodeURIComponent(gameId)}&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`),
    ]);
    return gameStateResponse({
      isFavorite: Array.isArray(favorite) && favorite.length > 0,
      userVote: Array.isArray(vote) && typeof vote[0]?.vote === "string" ? vote[0].vote : null,
      isLoggedIn: false,
    });
  } catch (error) {
    console.error("[game-state] edge fallback", { error: error instanceof Error ? error.message : String(error) });
    return gameStateResponse();
  }
}

async function handleMe(request, env) {
  const token = getSupabaseAccessToken(request.headers.get("cookie") || "", env);
  if (!token) return meResponse(null);

  try {
    const userResponse = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      signal: AbortSignal.timeout(1800),
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${token}`,
      },
    });
    if (!userResponse.ok) return meResponse(null);

    const user = await userResponse.json();
    const userId = typeof user?.id === "string" ? user.id : "";
    const email = typeof user?.email === "string" ? user.email : "";
    if (!isUuid(userId)) return meResponse(null);

    const profiles = await supabaseRest(
      env,
      `/rest/v1/profiles?select=username,avatar_url,first_name,last_name,display_name,role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    );
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile || profile.status === "blocked") return meResponse(null);

    return meResponse({
      username: typeof profile.username === "string" ? profile.username : "",
      email,
      avatarUrl: normalizeSiteAssetUrl(profile.avatar_url),
      firstName: typeof profile.first_name === "string" ? profile.first_name : null,
      lastName: typeof profile.last_name === "string" ? profile.last_name : null,
      displayName: typeof profile.display_name === "string" ? profile.display_name : null,
      role: profile.role === "admin" ? "admin" : "member",
    });
  } catch (error) {
    console.error("[me] edge fallback", { error: error instanceof Error ? error.message : String(error) });
    return meResponse(null);
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
