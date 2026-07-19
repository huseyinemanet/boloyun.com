import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const auditedMutationSurfaces = [
  "src/app/admin/ads/actions.ts",
  "src/app/admin/categories/actions.ts",
  "src/app/admin/tags/actions.ts",
  "src/app/admin/static-pages/actions.ts",
  "src/app/admin/ai/actions.ts",
  "src/app/api/admin/games/[id]/route.ts",
  "src/app/api/admin/static-pages/route.ts",
  "src/app/api/admin/ai/automation/route.ts",
  "src/app/api/admin/ai/automation/state/route.ts",
  "src/app/api/admin/ai/process/route.ts",
];

for (const relativePath of auditedMutationSurfaces) {
  test(`${relativePath} yönetici denetim kaydı yazar`, () => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    assert.match(source, /recordAdminAudit/);
  });
}
