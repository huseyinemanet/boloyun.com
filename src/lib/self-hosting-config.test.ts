import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production build uses the standalone Node runtime", async () => {
  const [nextConfig, packageJson] = await Promise.all([
    readFile(new URL("../../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(nextConfig, /output:\s*["']standalone["']/);
  assert.match(nextConfig, /deploymentId:\s*process\.env\.DEPLOYMENT_VERSION/);
  assert.doesNotMatch(nextConfig, /@opennextjs\/cloudflare/);
  assert.doesNotMatch(packageJson, /opennextjs-cloudflare|cf:deploy|cf:build|wrangler/);
});
