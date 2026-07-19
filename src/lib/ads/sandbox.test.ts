import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildSandboxedAdDocument } from "./sandbox";

test("reklam belgesi parent erişimi ve form gönderimini kısıtlayan CSP ile üretilir", () => {
  const document = buildSandboxedAdDocument("<script>window.testAd = true</script>");
  assert.match(document, /default-src 'none'/);
  assert.match(document, /base-uri 'none'/);
  assert.match(document, /form-action 'none'/);
  assert.match(document, /<body><script>window\.testAd = true<\/script><\/body>/);
});

test("public reklam bileşeni ham HTML'i parent DOM'a basmaz", () => {
  const source = readFileSync(path.join(process.cwd(), "src/components/ads/sandboxed-ad.tsx"), "utf8");
  assert.match(source, /sandbox="allow-scripts allow-popups"/);
  assert.doesNotMatch(source, /allow-same-origin|allow-forms|allow-top-navigation|dangerouslySetInnerHTML/);
});
