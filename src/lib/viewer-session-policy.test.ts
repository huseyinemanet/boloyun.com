import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("/api/me distinguishes anonymous sessions from temporary viewer failures", () => {
  const route = source("src/app/api/me/route.ts");

  assert.match(route, /isAuthSessionMissingError\(userError\)/);
  assert.match(route, /status:\s*"anonymous"/);
  assert.match(route, /status:\s*"authenticated"/);
  assert.match(route, /status:\s*"unavailable"/);
  assert.match(route, /code:\s*"viewer_unavailable"/);
  assert.match(route, /profileError \|\| !profile/);
});

test("/api/me propagates refreshed cookies and remains private", () => {
  const route = source("src/app/api/me/route.ts");

  assert.match(route, /createSupabaseRouteClient\(\)/);
  assert.match(route, /routeClient\.applyTo\(response\)/);
  assert.match(route, /response\.headers\.set\("Cache-Control", "private, no-store"\)/);
  assert.match(route, /response\.headers\.set\("Vary", "Cookie"\)/);
});

test("viewer requests only deduplicate while in flight and recover after temporary failures", () => {
  const provider = source("src/components/auth/viewer-state-provider.tsx");

  assert.match(provider, /finally\s*{/);
  assert.match(provider, /viewerPromise === request/);
  assert.match(provider, /loadViewerProfileWithRetry/);
  assert.match(provider, /window\.setTimeout\(resolve, 250\)/);
  assert.match(provider, /document\.addEventListener\("visibilitychange"/);
  assert.match(provider, /\[pathname, refresh\]/);
  assert.doesNotMatch(provider, /catch\(\(\) => \{\s*viewerPromise = null;\s*throw error;/);
});

test("header auth links cross a full-document boundary without changing all SoundLink navigation", () => {
  const accountMenu = source("src/components/layout/header-account-menu.tsx");
  const soundLink = source("src/components/audio/sound-link.tsx");

  assert.match(accountMenu, /<a href="\/giris" data-click-sound="true"/);
  assert.match(accountMenu, /<a href="\/kayit" data-click-sound="true"/);
  assert.doesNotMatch(accountMenu, /<SoundLink href="\/giris" native/);
  assert.match(soundLink, /<Link/);
  assert.match(soundLink, /void native;/);
});
