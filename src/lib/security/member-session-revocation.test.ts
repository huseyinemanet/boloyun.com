import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("hesap engelleme Supabase Auth ban durumuyla birlikte uygulanır", () => {
  const source = readFileSync(path.join(process.cwd(), "src/lib/db-users.ts"), "utf8");

  assert.match(source, /setAuthUserBlocked/);
  assert.match(source, /ban_duration: blocked \? "876000h" : "none"/);
  assert.match(source, /updateAdminProfilesAtomic[\s\S]*setAuthUserBlocked/);
});
