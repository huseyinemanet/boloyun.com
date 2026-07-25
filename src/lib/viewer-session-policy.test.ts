import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("/api/me yenilenen Supabase çerezlerini yanıta taşır ve private kalır", () => {
  const route = readFileSync(path.join(process.cwd(), "src/app/api/me/route.ts"), "utf8");

  assert.match(route, /createSupabaseRouteClient/);
  assert.match(route, /routeClient\.applyTo/);
  assert.match(route, /cacheHeaders\("privateNoStore"\)/);
  assert.match(route, /headers\.set\("Vary", "Cookie"\)/);
  assert.match(route, /status: 503/);
  assert.match(route, /viewer_unavailable/);
});

test("ilk kişisel veri istekleri kesin viewer sonucunu bekler", () => {
  const continuePlaying = readFileSync(
    path.join(process.cwd(), "src/components/game/continue-playing-section.tsx"),
    "utf8",
  );
  const gameState = readFileSync(
    path.join(process.cwd(), "src/app/(public)/oyun/[slug]/game-user-actions.tsx"),
    "utf8",
  );

  for (const source of [continuePlaying, gameState]) {
    assert.match(source, /viewerStatus !== "authenticated" && viewerStatus !== "anonymous"/);
  }
});

test("header unavailable durumunu giriş bağlantısı olarak göstermez", () => {
  const header = readFileSync(
    path.join(process.cwd(), "src/components/layout/header-account-menu.tsx"),
    "utf8",
  );

  assert.match(header, /status === "unavailable"[\s\S]*?<AccountUnavailable/);
  assert.match(header, /Hesap durumunu yeniden kontrol et/);
});
