import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("service role secret production image build sürecine hiç girmez", () => {
  const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/quality.yml"), "utf8");

  assert.doesNotMatch(dockerfile, /^(ARG|ENV) SUPABASE_SERVICE_ROLE_KEY/m);
  assert.doesNotMatch(workflow, /--build-arg SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(dockerfile, /SUPABASE_SERVICE_ROLE_KEY|supabase_service_role_key/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|supabase_service_role_key/);
  assert.match(dockerfile, /BOL_OYUN_PREBUILD_FALLBACK=1/);
});

test("routine deploy yalnız imzalı image paketini taşır", () => {
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/quality.yml"), "utf8");
  const deploy = readFileSync(path.join(process.cwd(), "deploy/server/boloyun-deploy"), "utf8");
  const compose = readFileSync(path.join(process.cwd(), "deploy/compose.yml"), "utf8");

  assert.match(workflow, /VPS_DEPLOY_SIGNING_PRIVATE_KEY/);
  assert.match(workflow, /openssl pkeyutl -sign -rawin/);
  assert.match(workflow, /boloyun-\$\{\{ github\.sha \}\}\.manifest/);
  assert.match(workflow, /boloyun-\$\{\{ github\.sha \}\}\.sig/);
  assert.doesNotMatch(workflow, /boloyun-compose-|boloyun-deploy-\$\{GITHUB_SHA\}/);
  assert.match(deploy, /openssl pkeyutl -verify -pubin/);
  assert.ok(deploy.indexOf("pkeyutl -verify") < deploy.indexOf("docker load"));
  assert.ok(deploy.indexOf("actual_archive_sha256") < deploy.indexOf("docker load"));
  assert.doesNotMatch(deploy, /candidate_compose|candidate_deploy|install .*\/usr\/local\/sbin\/boloyun-deploy/);
  assert.match(deploy, /-f "\$compose_file"/);
  assert.match(compose, /pull_policy: never/g);
  assert.match(compose, /user: "1001:1001"/g);
});

test("GitHub Actions immutable SHA değerlerine sabitlenmiştir", () => {
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/quality.yml"), "utf8");
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(workflow, /pnpm\/action-setup@b0f76dfb45f55f8421693e4803ac7bb65143bd34/);
  assert.match(workflow, /docker\/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c/);
  assert.match(workflow, /docker\/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(workflow, /actions\/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c/);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
  assert.match(workflow, /pnpm audit --audit-level high/);
});

test("üretim bağımlılık ağacı yamalı Sharp sürümünü zorlar ve shadcn CLI geliştirmede kalır", () => {
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const workspace = readFileSync(path.join(process.cwd(), "pnpm-workspace.yaml"), "utf8");

  assert.equal(packageJson.dependencies?.shadcn, undefined);
  assert.equal(packageJson.devDependencies?.shadcn, "4.16.1");
  assert.equal(packageJson.dependencies?.sharp, "0.35.4");
  assert.match(workspace, /'next>sharp': 0\.35\.4/);
});

test("Ruffle sabit npm sürümünden self-host edilir ve CSP genel HTTPS scriptine izin vermez", () => {
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  const player = readFileSync(path.join(process.cwd(), "src/components/player/game-player.tsx"), "utf8");
  const nextConfig = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

  assert.equal(packageJson.dependencies?.["@ruffle-rs/ruffle"], "0.4.1");
  assert.match(player, /src="\/ruffle\/ruffle\.js"/);
  assert.doesNotMatch(player, /unpkg\.com/);
  const scriptSource = nextConfig.split("\n").find((line) => line.includes("script-src")) ?? "";
  assert.doesNotMatch(scriptSource, /https:(?!\/\/)/);
});

test("cron ve worker ortam değişkenleri örnek dosyada açıklanır", () => {
  const environment = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
  for (const key of [
    "AI_TRANSLATION_CRON_SECRET",
    "AI_AUTOMATION_WORKER_ENABLED",
    "AI_AUTOMATION_WORKER_INTERVAL_MS",
    "AI_AUTOMATION_WORKER_IDLE_INTERVAL_MS",
    "AI_AUTOMATION_WORKER_LIMIT",
  ]) assert.match(environment, new RegExp(`^${key}=`, "m"), key);
});
