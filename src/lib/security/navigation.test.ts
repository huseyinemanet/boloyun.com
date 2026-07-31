import assert from "node:assert/strict";
import test from "node:test";
import { buildOAuthCallbackUrl, safeLocalPath, safeOAuthPath } from "./navigation";

test("yalnız site içi yönlendirmelere izin verir", () => {
  assert.equal(safeLocalPath("/profil?sekme=favoriler"), "/profil?sekme=favoriler");
  for (const unsafe of ["//evil.example", "https://evil.example", "\\evil.example", "/\\evil.example", "\n//evil.example"]) {
    assert.equal(safeLocalPath(unsafe), "/");
  }
});

test("OAuth recovery sayfasına yönlendirilemez", () => {
  assert.equal(safeOAuthPath("/profil"), "/profil");
  assert.equal(safeOAuthPath("/sifre-yenile"), "/");
  assert.equal(safeOAuthPath("/sifre-yenile?from=google"), "/");
});

test("varsayılan OAuth dönüş adresine gereksiz next sorgusu eklenmez", () => {
  assert.equal(buildOAuthCallbackUrl("http://localhost:3000", "/"), "http://localhost:3000/auth/callback");
});

test("OAuth dönüş adresi varsayılan olmayan güvenli hedefi korur", () => {
  assert.equal(
    buildOAuthCallbackUrl("https://boloyun.com", "/profil?tab=favoriler"),
    "https://boloyun.com/auth/callback?next=%2Fprofil%3Ftab%3Dfavoriler",
  );
});
