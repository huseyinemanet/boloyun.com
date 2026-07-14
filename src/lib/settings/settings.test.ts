import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { matchesAudioSignature, matchesImageSignature } from "@/lib/settings/media-validation";
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
  assert.equal(matchesImageSignature(bytes("RIFF0000WEBP"), "image/webp"), true);
  assert.equal(matchesImageSignature(bytes("RIFF0000WAVE"), "image/webp"), false);
});

test("audio signatures must match the declared MIME type", () => {
  assert.equal(matchesAudioSignature(Uint8Array.from([0xff, 0xfb, 0x90, 0x64]), "audio/mpeg"), true);
  assert.equal(matchesAudioSignature(Uint8Array.from([0x49, 0x44, 0x33, 0x04]), "audio/mp3"), true);
  assert.equal(matchesAudioSignature(bytes("RIFF0000WAVE"), "audio/wav"), true);
  assert.equal(matchesAudioSignature(bytes("OggS0000"), "audio/ogg"), true);
  assert.equal(matchesAudioSignature(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]), "audio/webm"), true);
  assert.equal(matchesAudioSignature(bytes("<svg></svg>"), "audio/mpeg"), false);
  assert.equal(matchesAudioSignature(bytes("RIFF0000WEBP"), "audio/wav"), false);
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

function bytes(value: string) {
  return Uint8Array.from([...value].map((character) => character.charCodeAt(0)));
}
