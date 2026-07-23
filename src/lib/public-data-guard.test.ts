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

test("Docker ön derlemesi açık yedek modunda dış veri olmadan çalışabilir", () => {
  assert.equal(allowPublicDemoData("production", "false", "1"), true);
});

test("üretim çalışma zamanında ön derleme yedeği kapalı kalır", () => {
  assert.equal(allowPublicDemoData("production", "false", "0"), false);
});

test("veri kaynağı hatası canlı önbellek korumasını açıklar", () => {
  assert.match(
    publicDataUnavailable("Ana sayfa", "Supabase yapılandırması eksik").message,
    /Demo verinin canlı önbelleğe yazılması engellendi/,
  );
});
