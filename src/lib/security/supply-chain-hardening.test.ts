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
  assert.match(dockerfile, /SUPABASE_SERVICE_ROLE_KEY="\$\(cat \/run\/secrets\/supabase_service_role_key\)" pnpm build/);
  assert.match(workflow, /--secret id=supabase_service_role_key,env=SUPABASE_SERVICE_ROLE_KEY/);
});

test("GitHub Actions immutable SHA değerlerine sabitlenmiştir", () => {
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/quality.yml"), "utf8");
  assert.match(workflow, /actions\/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(workflow, /pnpm\/action-setup@b0f76dfb45f55f8421693e4803ac7bb65143bd34/);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
});

test("Ruffle sabit npm sürümünden self-host edilir ve CSP genel HTTPS scriptine izin vermez", () => {
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  const player = readFileSync(path.join(process.cwd(), "src/components/player/game-player.tsx"), "utf8");
  const nextConfig = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

  assert.equal(packageJson.dependencies?.["@ruffle-rs/ruffle"], "0.3.0");
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
