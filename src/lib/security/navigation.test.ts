import assert from "node:assert/strict";
import test from "node:test";
import { safeLocalPath } from "./navigation";

test("yalnız site içi yönlendirmelere izin verir", () => {
  assert.equal(safeLocalPath("/profil?sekme=favoriler"), "/profil?sekme=favoriler");
  for (const unsafe of ["//evil.example", "https://evil.example", "\\evil.example", "/\\evil.example", "\n//evil.example"]) {
    assert.equal(safeLocalPath(unsafe), "/");
  }
});
