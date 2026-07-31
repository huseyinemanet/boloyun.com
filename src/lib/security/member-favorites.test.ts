import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("anonim ziyaretçi API üzerinden favori ekleyemez", () => {
  const route = readFileSync(path.join(process.cwd(), "src/app/api/game-action/route.ts"), "utf8");

  assert.match(route, /if \(!profile\?\.id \|\| profile\.status !== "active"\)[\s\S]*?401/);
  assert.doesNotMatch(route, /setSessionFavorite/);
});

test("oyun aksiyonu same-origin, aktif hesap ve oran sınırı uygular", () => {
  const route = readFileSync(path.join(process.cwd(), "src/app/api/game-action/route.ts"), "utf8");

  assert.match(route, /hasTrustedMutationOrigin\(request\)/);
  assert.match(route, /profile\.status !== "active"/);
  assert.match(route, /game-favorite-user/);
  assert.match(route, /game-favorite-ip/);
  assert.match(route, /game-reaction-session/);
  assert.match(route, /game-reaction-ip/);
  assert.match(route, /Retry-After/);
});

test("anonim favori durumu oturum çerezinden okunmaz", () => {
  const route = readFileSync(path.join(process.cwd(), "src/app/api/game-state/route.ts"), "utf8");

  assert.doesNotMatch(route, /getSessionFavorite/);
  assert.match(route, /profile\?\.id[\s\S]*?getProfileFavorite[\s\S]*?Promise\.resolve\(false\)/);
});

test("favori butonu girişsiz ziyaretçiye üyelik diyaloğu gösterir", () => {
  const component = readFileSync(path.join(process.cwd(), "src/app/(public)/oyun/[slug]/game-user-actions.tsx"), "utf8");

  assert.match(component, /if \(!isLoggedIn\)[\s\S]*?setAuthDialogOpen\(true\)/);
  assert.match(component, /Favorilerine eklemek için giriş yap/);
  assert.match(component, /\/giris\?next=/);
  assert.match(component, /href="\/kayit"/);
});
