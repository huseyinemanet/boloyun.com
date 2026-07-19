import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(target) : entry.name === "route.ts" ? [target] : [];
  });
}

test("tüm admin route mutasyonları same-origin doğrular", () => {
  const roots = [path.join(process.cwd(), "src/app/api/admin"), path.join(process.cwd(), "src/app/admin")];
  const mutations = roots.flatMap(routeFiles).filter((file) => /export async function (POST|PATCH|PUT|DELETE)/.test(readFileSync(file, "utf8")));

  assert.ok(mutations.length > 0);
  for (const file of mutations) {
    assert.match(
      readFileSync(file, "utf8"),
      /hasTrustedMutationOrigin/,
      `${path.relative(process.cwd(), file)} same-origin kontrolü içermeli.`,
    );
  }
});
