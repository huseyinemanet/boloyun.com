import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("service role secret Docker katmanına veya build arg'a yazılmaz", () => {
  const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/quality.yml"), "utf8");

  assert.doesNotMatch(dockerfile, /^(ARG|ENV) SUPABASE_SERVICE_ROLE_KEY/m);
  assert.doesNotMatch(workflow, /--build-arg SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(dockerfile, /--mount=type=secret,id=supabase_service_role_key,required=true/);
  assert.match(dockerfile, /BOL_OYUN_PREBUILD_FALLBACK=1/);
  assert.match(dockerfile, /SUPABASE_SERVICE_ROLE_KEY="\$\(cat \/run\/secrets\/supabase_service_role_key\)" pnpm build/);
  assert.match(workflow, /secrets: \|\n\s+supabase_service_role_key=\$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
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
