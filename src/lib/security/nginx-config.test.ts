import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("production Nginx istemci tarafından taşınan güven başlıklarını yeniden üretir", () => {
  const config = readFileSync(path.join(process.cwd(), "deploy/server/nginx/boloyun.com.conf"), "utf8");

  assert.match(config, /proxy_set_header Host boloyun\.com;/);
  assert.match(config, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.match(config, /proxy_set_header X-Forwarded-For \$remote_addr;/);
  assert.match(config, /proxy_set_header X-Forwarded-Host boloyun\.com;/);
  assert.match(config, /proxy_set_header X-Forwarded-Proto https;/);
  assert.match(config, /proxy_set_header CF-Connecting-IP "";/);
  assert.match(config, /Strict-Transport-Security "max-age=31536000" always;/);
  assert.doesNotMatch(config, /\$proxy_add_x_forwarded_for/);
});
