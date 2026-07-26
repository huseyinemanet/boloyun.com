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

test("domain allowlist kapalı olsa bile oyun kaynağı güvenli HTTPS URL olmalıdır", () => {
  const security = { ...DEFAULT_SETTINGS.security, enforceIframeAllowlist: false };
  assert.equal(isGameSourceAllowed("https://games.example/play", security), true);
  for (const unsafe of [
    "http://games.example/play",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://user:password@games.example/play",
    "not a url",
    "",
  ]) assert.equal(isGameSourceAllowed(unsafe, security), false, unsafe);
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
  const paintbrushSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><title>paintbrush</title><g fill="#F7F7F7"><path d="M16.318 1.931C15.528 1.142 14.152 1.141 13.361 1.931L5.948 9.344C6.621 9.594 7.242 9.975 7.765 10.5C8.29 11.027 8.662 11.645 8.905 12.302L16.319 4.888C17.134 4.073 17.134 2.746 16.319 1.93L16.318 1.931Z" fill-opacity="0.4"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M3.98984 9.29252C5.37713 7.89005 7.60017 7.9142 8.97054 9.29091C10.3418 10.6685 10.343 12.8997 8.97295 14.2777C7.95219 15.3213 6.79225 15.8394 5.51026 15.9674C4.25618 16.0927 2.92172 15.8411 1.53421 15.4243C1.24453 15.3373 1.03547 15.0848 1.00405 14.7839C0.972619 14.4831 1.12497 14.1928 1.39041 14.0478C1.9391 13.7481 2.21442 13.462 2.37386 13.2082C2.53795 12.9471 2.61815 12.661 2.68975 12.2759C2.70535 12.192 2.72019 12.1036 2.73569 12.0114C2.86109 11.265 3.02947 10.2632 3.98984 9.29252Z"></path></g></svg>';
  assert.equal(sanitizeSvgInput(paintbrushSvg), paintbrushSvg);
  assert.equal(
    sanitizeSvgInput('<?xml version="1.0"?><svg class="icon" viewBox="0 0 18 18"><path d="M1 2" fill="currentColor" fill-opacity="0.2" data-color="color-2"/></svg>'),
    '<svg viewBox="0 0 18 18"><path d="M1 2" fill="currentColor" fill-opacity="0.2" data-color="color-2"/></svg>',
  );
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
