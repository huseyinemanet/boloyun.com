import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = "supabase/migrations/20260731201334_harden_member_data_access.sql";
const sql = readFileSync(path.join(process.cwd(), migrationPath), "utf8");

test("yorum moderasyonu doğrudan Data API yazımıyla aşılamaz", () => {
  assert.match(sql, /drop policy if exists "signed in users create pending comments"/i);
  assert.match(sql, /revoke insert, update, delete on table public\.comments from anon, authenticated/i);
});

test("engellenmiş hesaplar favori ve rating satırlarına doğrudan erişemez", () => {
  assert.match(sql, /create policy "active owners read favorites"[\s\S]*profiles\.status = 'active'/i);
  assert.match(sql, /create policy "active owners read ratings"[\s\S]*profiles\.status = 'active'/i);
  assert.match(sql, /revoke insert, update, delete on table public\.favorites from anon, authenticated/i);
  assert.match(sql, /revoke insert, update, delete on table public\.ratings from anon, authenticated/i);
});

test("doğrudan admin RLS erişimi aal2 gerektirir", () => {
  assert.match(sql, /create or replace function private\.is_admin\(\)/i);
  assert.match(sql, /auth\.jwt\(\) ->> 'aal'[\s\S]*= 'aal2'/i);
  assert.match(sql, /role = 'admin'[\s\S]*status = 'active'/i);
});

test("güvenlik migrationı oyun kayıtlarına veya ilişkilerine dokunmaz", () => {
  assert.doesNotMatch(sql, /\b(delete\s+from|truncate)\s+(public\.)?(games|game_categories|game_tags)\b/i);
  assert.doesNotMatch(sql, /\bpublication\b/i);
});
