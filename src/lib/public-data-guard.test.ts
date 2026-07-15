import assert from "node:assert/strict";
import test from "node:test";
import { allowPublicDemoData, publicDataUnavailable } from "@/lib/public-data-guard";

test("demo verisi üretim ortamında kapalıdır", () => {
  assert.equal(allowPublicDemoData("production", "false"), false);
  assert.equal(allowPublicDemoData("development"), true);
});

test("GitHub doğrulama build'i dış veri olmadan çalışabilir", () => {
  assert.equal(allowPublicDemoData("production", "true"), true);
});

test("veri kaynağı hatası canlı önbellek korumasını açıklar", () => {
  assert.match(
    publicDataUnavailable("Ana sayfa", "Supabase yapılandırması eksik").message,
    /Demo verinin canlı önbelleğe yazılması engellendi/,
  );
});
