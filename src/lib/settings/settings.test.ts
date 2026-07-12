import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { matchesImageSignature } from "@/lib/settings/media-validation";
import { SETTINGS_SECTIONS } from "@/lib/settings/types";
import { renderSeoTemplate, validateSettingsSection } from "@/lib/settings/validation";
import { sanitizeSvgInput } from "@/lib/sanitize/html";

test("all seeded setting sections pass strict validation", () => {
  for (const section of SETTINGS_SECTIONS) assert.deepEqual(validateSettingsSection(section, DEFAULT_SETTINGS[section]), DEFAULT_SETTINGS[section]);
});

test("unknown setting fields are rejected", () => {
  assert.throws(() => validateSettingsSection("general", { ...DEFAULT_SETTINGS.general, injected: true }), /alanları geçersiz/);
});

test("pruned legacy setting fields are ignored while reading existing records", () => {
  assert.deepEqual(validateSettingsSection("general", { ...DEFAULT_SETTINGS.general, contactEmail: "iletisim@boloyun.com", timezone: "Europe/Istanbul" }), DEFAULT_SETTINGS.general);
  assert.deepEqual(validateSettingsSection("community", { ...DEFAULT_SETTINGS.community, emailVerificationRequired: false }), DEFAULT_SETTINGS.community);
});

test("SEO templates reject unknown variables and render known variables", () => {
  assert.throws(() => validateSettingsSection("seo", { ...DEFAULT_SETTINGS.seo, gameTitleTemplate: "{{bilinmeyen}}" }), /bilinmeyen/);
  assert.equal(renderSeoTemplate("{{oyun_adı}} Oyna – {{site_adı}}", { oyun_adı: "Ateş ve Su", site_adı: "Bol Oyun" }), "Ateş ve Su Oyna – Bol Oyun");
});

test("canonical URL must use HTTPS", () => {
  assert.throws(() => validateSettingsSection("seo", { ...DEFAULT_SETTINGS.seo, canonicalDomain: "http://boloyun.com" }), /HTTPS/);
});

test("iframe wildcard allowlist covers root and subdomains only", () => {
  const security = { ...DEFAULT_SETTINGS.security, enforceIframeAllowlist: true, iframeAllowlist: ["*.miniplay.com"] };
  assert.equal(isGameSourceAllowed("https://www.miniplay.com/game", security), true);
  assert.equal(isGameSourceAllowed("https://miniplay.com/game", security), true);
  assert.equal(isGameSourceAllowed("https://example.com/game", security), false);
});

test("image signatures must match the declared MIME type", () => {
  assert.equal(matchesImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(matchesImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/png"), false);
  assert.equal(matchesImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg"), true);
});

test("SVG temizleyici yalnız güvenli etiket ve nitelikleri kabul eder", () => {
  assert.equal(sanitizeSvgInput('<svg viewBox="0 0 24 24"><path d="M1 2" fill="none"/></svg>'), '<svg viewBox="0 0 24 24"><path d="M1 2" fill="none"/></svg>');
  for (const unsafe of [
    '<svg onload="alert(1)"><path d="M1 2"/></svg>',
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>html</div></foreignObject></svg>',
    '<svg><path style="background:url(javascript:alert(1))"/></svg>',
    '<svg><use href="data:image/svg+xml,x"/></svg>',
  ]) assert.equal(sanitizeSvgInput(unsafe), "");
});
