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
      return handleSearch(request, env);
    }
    if (url.pathname === "/rastgele") {
      return handleRandomGame(request, env);
    }
    if (url.pathname.startsWith("/admin") && isPrefetchRequest(request, url)) {
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    if (url.pathname.startsWith("/oyun/")) {
      if (isRscRequest(request, url)) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      if (url.pathname === "/oyun/city-car-stunt-2") return handleEdgeGamePage(request, env, "city-car-stunt-2");
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

async function handleSearch(request, env) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const popular = url.searchParams.get("popular") === "1";
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    "x-edge-fallback": "search",
  };

  if (!popular && query.length < 2) return new Response(JSON.stringify({ items: [] }), { headers });

  try {
    const select = "id,title,slug,thumbnail_url,short_description";
    const limit = popular && query.length < 2 ? 5 : 6;
    const path = popular && query.length < 2
      ? `/rest/v1/games?select=${select}&status=eq.published&order=play_count.desc,updated_at.desc&limit=${limit}`
      : `/rest/v1/games?select=${select}&status=eq.published&title=ilike.*${encodeURIComponent(escapePostgrestLike(query))}*&order=play_count.desc&limit=${limit}`;
    const rows = await supabaseRest(env, path);
    const items = Array.isArray(rows) ? rows.map(mapSearchSuggestion) : [];
    return new Response(JSON.stringify({ items }), { headers });
  } catch (error) {
    console.error("[search] edge fallback failed", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ items: [] }), { headers });
  }
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

async function handleEdgeGamePage(request, env, slug) {
  try {
    const rows = await supabaseRest(
      env,
      `/rest/v1/games?select=id,title,slug,short_description,long_description,how_to_play,controls,features,thumbnail_url,embed_url,html5_url,swf_url,external_url,game_type,likes_count,dislikes_count,rating_avg,rating_count,play_count,seo_title,seo_description&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
    );
    const game = Array.isArray(rows) ? rows[0] : null;
    if (!game) return new Response("Not found", { status: 404 });

    return new Response(renderGameHtml(game), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        "x-edge-fallback": "game-detail",
      },
    });
  } catch (error) {
    console.error("[game-page] edge fallback failed", { slug, error: error instanceof Error ? error.message : String(error) });
    return new Response("Oyun sayfası şu anda yüklenemedi.", { status: 503, headers: { "cache-control": "no-store" } });
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

function isRscRequest(request, url) {
  return request.headers.get("rsc") === "1" ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    url.searchParams.has("_rsc");
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

function escapePostgrestLike(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "\\*");
}

function renderGameHtml(game) {
  const title = escapeHtml(game.title || "Oyun");
  const description = escapeHtml(game.seo_description || game.short_description || "");
  const thumbnail = escapeAttribute(game.thumbnail_url || "/thumbnails/space.svg");
  const source = escapeAttribute(game.embed_url || game.html5_url || game.swf_url || game.external_url || "");
  const sourceText = source ? "" : "<p>Bu oyun için oynatma adresi eksik.</p>";
  const controls = Array.isArray(game.controls) ? game.controls : [];
  const features = Array.isArray(game.features) ? game.features : [];

  return `<!doctype html>
<html lang="tr" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(game.seo_title || `${game.title} Oyna`)}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://boloyun.com/oyun/${escapeAttribute(game.slug || "")}">
  <style>
    :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#09090b;color:#f8fafc}
    body{margin:0;background:#09090b;color:#f8fafc}a{color:inherit}.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:20px;padding:14px 18px;border-bottom:1px solid #27272a;background:rgba(9,9,11,.92);backdrop-filter:blur(12px)}.logo{font-weight:900;font-size:28px;color:#f8fafc;text-decoration:none}.logo span{color:#f8b800}.wrap{max-width:1180px;margin:0 auto;padding:18px}.card{border:1px solid #2f2f35;background:#18181b;border-radius:8px;padding:16px}.hero{display:grid;grid-template-columns:220px 1fr;gap:18px}.thumb{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#27272a}.muted{color:#a1a1aa}.metrics{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0;padding:12px 0;border-block:1px solid #2f2f35}.actions{display:flex;gap:10px;align-items:center}.btn{border:0;border-radius:8px;background:#f8b800;color:#171717;font-weight:800;padding:11px 16px;cursor:pointer}.ghost{background:#27272a;color:#f8fafc}.player{margin-top:16px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#000;display:grid;place-items:center}.player iframe{width:100%;height:100%;border:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.list{margin:0;padding-left:20px}.notice{margin-top:10px;color:#a1a1aa;font-size:13px}@media(max-width:760px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.top{gap:12px}.logo{font-size:23px}}
  </style>
</head>
<body>
  <header class="top"><a class="logo" href="/"><span>Bol</span>Oyun</a><a href="/kategori/3d-oyunlar">3D Oyunlar</a><a href="/rastgele">Rastgele</a></header>
  <main class="wrap">
    <article class="card">
      <div class="hero">
        <img class="thumb" src="${thumbnail}" alt="${title} kapak görseli">
        <div>
          <p class="muted"><a href="/">Oyunlar</a></p>
          <h1>${title}</h1>
          <p class="muted">${escapeHtml(game.short_description || "")}</p>
          <div class="metrics">
            <span>Puan: ${Number(game.rating_avg || 0).toFixed(1)} / 5</span>
            <span>Oy: ${Number(game.rating_count || 0).toLocaleString("tr-TR")}</span>
            <span>Oynanma: ${Number(game.play_count || 0).toLocaleString("tr-TR")}</span>
          </div>
          <div class="actions">
            <button class="btn ghost" data-vote="like">Beğendim <span id="likes">${Number(game.likes_count || 0).toLocaleString("tr-TR")}</span></button>
            <button class="btn ghost" data-vote="dislike">Beğenmedim <span id="dislikes">${Number(game.dislikes_count || 0).toLocaleString("tr-TR")}</span></button>
            <button class="btn ghost" id="favorite">Favorilere Ekle</button>
          </div>
        </div>
      </div>
      <div class="player" id="player"><button class="btn" id="start">Oyunu Başlat</button>${sourceText}</div>
    </article>
    <section class="grid">
      <div class="card"><h2>Nasıl Oynanır?</h2><p>${escapeHtml(game.how_to_play || game.long_description || game.short_description || "")}</p></div>
      <div class="card"><h2>Kontroller</h2><ul class="list">${controls.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("") || "<li>Oyun içi yönergeleri takip et.</li>"}</ul></div>
      <div class="card"><h2>Özellikler</h2><ul class="list">${features.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("") || "<li>Tarayıcıda oynanır.</li>"}</ul></div>
    </section>
    <p class="notice">Bu sayfa Cloudflare hızlı fallback ile sunuluyor.</p>
  </main>
  <script>
    const source=${JSON.stringify(source)};
    const gameId=${JSON.stringify(game.id || "")};
    document.getElementById("start")?.addEventListener("click",()=>{if(!source)return;document.getElementById("player").innerHTML='<iframe title="${escapeAttribute(game.title || "Oyun")}" src="'+source+'" allow="fullscreen; autoplay; gamepad" allowfullscreen sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms"></iframe>';});
    async function action(payload){const r=await fetch('/api/game-action',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({gameId,...payload})});return r.json();}
    document.querySelectorAll('[data-vote]').forEach((btn)=>btn.addEventListener('click',async()=>{btn.disabled=true;try{const d=await action({action:'vote',vote:btn.dataset.vote});if(d.likesCount!==undefined)document.getElementById('likes').textContent=Number(d.likesCount).toLocaleString('tr-TR');if(d.dislikesCount!==undefined)document.getElementById('dislikes').textContent=Number(d.dislikesCount).toLocaleString('tr-TR');}finally{btn.disabled=false;}}));
    document.getElementById('favorite')?.addEventListener('click',async(e)=>{const btn=e.currentTarget;btn.disabled=true;try{const desired=btn.dataset.on!=='1';const d=await action({action:'favorite',desired});btn.dataset.on=d.isFavorite?'1':'0';btn.textContent=d.isFavorite?'Favorilerden Çıkar':'Favorilere Ekle';}finally{btn.disabled=false;}});
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
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
