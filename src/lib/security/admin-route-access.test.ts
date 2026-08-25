import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { classifyAdminAccess } from "./admin-access-decision";
import type { CurrentProfile } from "@/lib/auth";

const admin: CurrentProfile = {
  id: "profile-1",
  userId: "user-1",
  username: "admin",
  email: "admin@example.com",
  avatarUrl: null,
  firstName: null,
  lastName: null,
  displayName: null,
  role: "admin",
  status: "active",
};

test("admin erişim kararı kimlik, rol, durum ve AAL2'yi birlikte zorunlu tutar", () => {
  assert.deepEqual(classifyAdminAccess(null, false), { allowed: false, reason: "unauthenticated" });
  assert.deepEqual(classifyAdminAccess(null, true), { allowed: false, reason: "auth_unavailable" });
  assert.deepEqual(classifyAdminAccess({ ...admin, role: "member" }, false), { allowed: false, reason: "forbidden" });
  assert.deepEqual(classifyAdminAccess({ ...admin, status: "blocked" }, false), { allowed: false, reason: "forbidden" });
  assert.deepEqual(classifyAdminAccess(admin, false, "aal1"), { allowed: false, reason: "mfa_required" });
  assert.deepEqual(classifyAdminAccess(admin, false, "unavailable"), { allowed: false, reason: "auth_unavailable" });
  assert.deepEqual(classifyAdminAccess(admin, false, "aal2"), { allowed: true, admin });
});

test("tüm human-admin route handler'ları ortak AAL2 adapter'ını body parsing öncesi kullanır", () => {
  const roots = [path.join(process.cwd(), "src/app/api/admin"), path.join(process.cwd(), "src/app/admin")];
  const routes = roots.flatMap(routeFiles);
  assert.equal(routes.length, 14);
  for (const file of routes) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /authorizeAdminRoute/, path.relative(process.cwd(), file));
    assert.doesNotMatch(source, /getCurrentProfile|requireAdmin/, path.relative(process.cwd(), file));
    const guard = source.indexOf("authorizeAdminRoute(");
    for (const parser of ["request.json(", "request.formData("]) {
      const parserIndex = source.indexOf(parser);
      if (parserIndex >= 0) assert.ok(guard >= 0 && guard < parserIndex, `${path.relative(process.cwd(), file)}: guard ${parser} öncesi olmalı`);
    }
  }
});

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(target) : entry.name === "route.ts" ? [target] : [];
  });
}
