import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import type { SettingsDataMap, SettingsSection } from "@/lib/settings/types";

const TEMPLATE_VARIABLES = new Set(["site_adı", "oyun_adı", "kategori_adı", "sayfa"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]);
const LEGACY_SETTINGS_KEYS: Partial<Record<SettingsSection, string[]>> = {
  general: ["tagline", "description", "contactEmail", "locale", "timezone", "defaultCoverUrl"],
  community: ["emailVerificationRequired"],
};

export function validateSettingsSection<S extends SettingsSection>(section: S, input: unknown): SettingsDataMap[S] {
  const value = omitKeys(record(input), LEGACY_SETTINGS_KEYS[section] ?? []);
  assertExactKeys(value, Object.keys(DEFAULT_SETTINGS[section]), section);

  switch (section) {
    case "general":
      return {
        siteName: text(value.siteName, "Site adı", 2, 80),
        maintenanceMode: boolean(value.maintenanceMode, "Bakım modu"),
        registrationsEnabled: boolean(value.registrationsEnabled, "Yeni üyelikler"),
        logoUrl: assetUrl(value.logoUrl, "Logo"),
        faviconUrl: assetUrl(value.faviconUrl, "Favicon"),
      } as SettingsDataMap[S];
    case "appearance":
      return {
        heroTitle: text(value.heroTitle, "Hero başlığı", 3, 120),
        heroDescription: text(value.heroDescription, "Hero açıklaması", 10, 500),
        announcementEnabled: boolean(value.announcementEnabled, "Duyuru bandı"),
        announcementText: text(value.announcementText, "Duyuru metni", 0, 240),
        announcementUrl: optionalHttpsOrPath(value.announcementUrl, "Duyuru bağlantısı"),
      } as SettingsDataMap[S];
    case "games":
      return {
        playerAspectRatio: literal(value.playerAspectRatio, ["16:9", "4:3"] as const, "Oynatıcı oranı"),
        allowFullscreen: boolean(value.allowFullscreen, "Tam ekran"),
        loadTimeoutSeconds: integer(value.loadTimeoutSeconds, "Yükleme zaman aşımı", 5, 120),
        allowGuestPlay: boolean(value.allowGuestPlay, "Misafir oynama"),
        showPlayCount: boolean(value.showPlayCount, "Oynanma sayısı"),
        likesEnabled: boolean(value.likesEnabled, "Beğeni"),
        favoritesEnabled: boolean(value.favoritesEnabled, "Favori"),
        sharingEnabled: boolean(value.sharingEnabled, "Paylaşım"),
        similarGameStrategy: literal(value.similarGameStrategy, ["taxonomy", "category", "popular"] as const, "Benzer oyun seçimi"),
      } as SettingsDataMap[S];
    case "seo":
      return {
        defaultTitle: text(value.defaultTitle, "Varsayılan başlık", 3, 100),
        defaultTitleTemplate: template(value.defaultTitleTemplate, "Başlık şablonu"),
        defaultDescription: text(value.defaultDescription, "Meta açıklaması", 10, 320),
        gameTitleTemplate: template(value.gameTitleTemplate, "Oyun başlık şablonu"),
        categoryTitleTemplate: template(value.categoryTitleTemplate, "Kategori başlık şablonu"),
        categoryDescriptionTemplate: template(value.categoryDescriptionTemplate, "Kategori açıklama şablonu", 320),
        canonicalDomain: httpsUrl(value.canonicalDomain, "Canonical domain").replace(/\/$/, ""),
        openGraphImageUrl: assetUrl(value.openGraphImageUrl, "Open Graph görseli"),
        robotsDisallow: pathArray(value.robotsDisallow, "Robots engel listesi", 30),
        sitemapEnabled: boolean(value.sitemapEnabled, "Sitemap"),
        sitemapIncludeTags: boolean(value.sitemapIncludeTags, "Sitemap etiketleri"),
        sitemapIncludeStaticPages: boolean(value.sitemapIncludeStaticPages, "Sitemap sayfaları"),
        searchIndexable: boolean(value.searchIndexable, "Arama indeksleme"),
        structuredDataEnabled: boolean(value.structuredDataEnabled, "Yapılandırılmış veri"),
        googleVerification: token(value.googleVerification, "Google doğrulama"),
        bingVerification: token(value.bingVerification, "Bing doğrulama"),
      } as SettingsDataMap[S];
    case "ads":
      return {
        enabled: boolean(value.enabled, "Reklamlar"),
        showToMembers: boolean(value.showToMembers, "Üyelere reklam"),
        preRollEnabled: boolean(value.preRollEnabled, "Oyun açılış reklamı"),
        preRollSkipSeconds: integer(value.preRollSkipSeconds, "Reklam geçme süresi", 0, 60),
        adsTxt: text(value.adsTxt, "ads.txt", 0, 20000),
      } as SettingsDataMap[S];
    case "community": {
      const min = integer(value.usernameMinLength, "Minimum kullanıcı adı", 3, 20);
      const max = integer(value.usernameMaxLength, "Maksimum kullanıcı adı", min, 50);
      const patternValue = text(value.usernamePattern, "Kullanıcı adı deseni", 3, 200);
      try { new RegExp(patternValue); } catch { throw new Error("Kullanıcı adı deseni geçerli bir düzenli ifade değil."); }
      return {
        registrationsEnabled: boolean(value.registrationsEnabled, "Üyelikler"),
        usernameMinLength: min,
        usernameMaxLength: max,
        usernamePattern: patternValue,
        minimumAge: integer(value.minimumAge, "Minimum yaş", 0, 18),
        profilePhotoEnabled: boolean(value.profilePhotoEnabled, "Profil fotoğrafı"),
        commentsEnabled: boolean(value.commentsEnabled, "Yorumlar"),
        commentsRequireApproval: boolean(value.commentsRequireApproval, "Yorum ön onayı"),
        blockedWords: stringArray(value.blockedWords, "Yasaklı kelimeler", 200, 80),
        dailyCommentLimit: integer(value.dailyCommentLimit, "Günlük yorum limiti", 1, 500),
        ratingsEnabled: boolean(value.ratingsEnabled, "Puanlama"),
        favoritesEnabled: boolean(value.favoritesEnabled, "Favoriler"),
      } as SettingsDataMap[S];
    }
    case "integrations":
      return {
        googleAnalyticsId: integrationId(value.googleAnalyticsId, "GA4", /^G-[A-Z0-9]+$/i),
        googleTagManagerId: integrationId(value.googleTagManagerId, "GTM", /^GTM-[A-Z0-9]+$/i),
        clarityProjectId: integrationId(value.clarityProjectId, "Clarity", /^[a-z0-9]+$/i),
        metaPixelId: integrationId(value.metaPixelId, "Meta Pixel", /^\d+$/),
        consentModeEnabled: boolean(value.consentModeEnabled, "Consent Mode"),
      } as SettingsDataMap[S];
    case "security":
      return {
        uploadMaxMb: integer(value.uploadMaxMb, "Yükleme boyutu", 1, 20),
        allowedUploadMimeTypes: mimeArray(value.allowedUploadMimeTypes),
        iframeAllowlist: domainArray(value.iframeAllowlist),
        enforceIframeAllowlist: boolean(value.enforceIframeAllowlist, "Iframe izin listesi"),
      } as SettingsDataMap[S];
    case "audio":
      return {
        clickSoundEnabled: boolean(value.clickSoundEnabled, "Tıklama sesi"),
        clickSoundUrl: assetUrl(value.clickSoundUrl, "Tıklama sesi dosyası"),
      } as SettingsDataMap[S];
    case "system":
      return {} as SettingsDataMap[S];
  }
}

export function renderSeoTemplate(value: string, variables: Partial<Record<"site_adı" | "oyun_adı" | "kategori_adı" | "sayfa", string>>) {
  return value.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => variables[key.trim() as keyof typeof variables] ?? "");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ayar verisi geçerli bir nesne değil.");
  return value as Record<string, unknown>;
}

function omitKeys(value: Record<string, unknown>, keys: string[]) {
  if (!keys.length) return value;
  const result = { ...value };
  for (const key of keys) delete result[key];
  return result;
}

function assertExactKeys(value: Record<string, unknown>, expected: string[], section: string) {
  const expectedSet = new Set(expected);
  const missing = expected.filter((key) => !(key in value));
  const unknown = Object.keys(value).filter((key) => !expectedSet.has(key));
  if (missing.length || unknown.length) throw new Error(`${section} ayar alanları geçersiz.`);
}

function text(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") throw new Error(`${label} metin olmalıdır.`);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new Error(`${label} ${min}-${max} karakter arasında olmalıdır.`);
  return result;
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} aç/kapat değeri olmalıdır.`);
  return value;
}

function integer(value: unknown, label: string, min: number, max: number) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new Error(`${label} ${min}-${max} arasında olmalıdır.`);
  return Number(value);
}

function literal<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(`${label} geçersiz.`);
  return value as T;
}

function httpsUrl(value: unknown, label: string) {
  const result = text(value, label, 8, 2048);
  let parsed: URL;
  try { parsed = new URL(result); } catch { throw new Error(`${label} geçerli bir URL olmalıdır.`); }
  if (parsed.protocol !== "https:") throw new Error(`${label} HTTPS kullanmalıdır.`);
  return parsed.toString();
}

function assetUrl(value: unknown, label: string) {
  const result = text(value, label, 1, 2048);
  if (result.startsWith("/")) return result;
  return httpsUrl(result, label);
}

function optionalHttpsOrPath(value: unknown, label: string) {
  if (value === "") return "";
  return assetUrl(value, label);
}

function template(value: unknown, label: string, max = 160) {
  const result = text(value, label, 3, max);
  for (const match of result.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
    if (!TEMPLATE_VARIABLES.has(match[1].trim())) throw new Error(`${label} bilinmeyen bir şablon değişkeni içeriyor.`);
  }
  return result;
}

function token(value: unknown, label: string) {
  const result = text(value, label, 0, 300);
  if (/[<>]/.test(result)) throw new Error(`${label} yalnızca doğrulama kodunu içermelidir.`);
  return result;
}

function integrationId(value: unknown, label: string, pattern: RegExp) {
  const result = text(value, label, 0, 100);
  if (result && !pattern.test(result)) throw new Error(`${label} kimliği geçersiz.`);
  return result;
}

function stringArray(value: unknown, label: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} geçersiz.`);
  return [...new Set(value.map((item) => text(item, label, 1, maxLength).toLocaleLowerCase("tr-TR")))];
}

function pathArray(value: unknown, label: string, maxItems: number) {
  const paths = stringArray(value, label, maxItems, 200);
  if (paths.some((item) => !item.startsWith("/") || item.includes(".."))) throw new Error(`${label} yalnızca güvenli site yolları içermelidir.`);
  return paths;
}

function mimeArray(value: unknown) {
  const values = stringArray(value, "Dosya türleri", ALLOWED_MIME_TYPES.size, 80);
  if (!values.length || values.some((item) => !ALLOWED_MIME_TYPES.has(item))) throw new Error("İzin verilen dosya türleri geçersiz.");
  return values;
}

function domainArray(value: unknown) {
  const values = stringArray(value, "Iframe domainleri", 200, 253);
  for (const domain of values) {
    if (!/^(?:\*\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain) || domain.includes("..")) throw new Error(`Geçersiz iframe domaini: ${domain}`);
  }
  return values;
}
