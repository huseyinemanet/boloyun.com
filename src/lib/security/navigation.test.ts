import assert from "node:assert/strict";
import test from "node:test";
import { safeLocalPath, safeOAuthPath } from "./navigation";

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
