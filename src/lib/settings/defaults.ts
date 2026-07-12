import type { SettingsDataMap, SettingsSection } from "@/lib/settings/types";

export const DEFAULT_SETTINGS: SettingsDataMap = {
  general: {
    siteName: "Bol Oyun",
    maintenanceMode: false,
    registrationsEnabled: true,
    logoUrl: "/logo.svg",
    faviconUrl: "/favicon.ico",
  },
  appearance: {
    heroTitle: "Ücretsiz Mini Oyunlar Oyna",
    heroDescription: "Bol Oyun’da aksiyon, araba, futbol, zombi, çocuk, beceri ve klasik Flash oyunlarını keşfet. Oyunu seç, Oyunu Başlat butonuna bas ve indirme yapmadan tarayıcıda oyna.",
    announcementEnabled: false,
    announcementText: "",
    announcementUrl: "",
  },
  games: {
    playerAspectRatio: "16:9",
    allowFullscreen: true,
    loadTimeoutSeconds: 20,
    allowGuestPlay: true,
    showPlayCount: true,
    likesEnabled: true,
    favoritesEnabled: true,
    sharingEnabled: true,
    similarGameStrategy: "taxonomy",
  },
  seo: {
    defaultTitle: "Ücretsiz Oyunlar Oyna",
    defaultTitleTemplate: "{{sayfa}} | {{site_adı}}",
    defaultDescription: "En sevilen mini oyunları, klasik Flash oyunlarını, araba, aksiyon, spor ve beceri oyunlarını ücretsiz oyna.",
    gameTitleTemplate: "{{oyun_adı}} Oyna – {{site_adı}}",
    categoryTitleTemplate: "{{kategori_adı}} Oyunları – {{site_adı}}",
    categoryDescriptionTemplate: "En sevilen {{kategori_adı}} oyunlarını {{site_adı}}’da ücretsiz oyna.",
    canonicalDomain: "https://boloyun.com",
    openGraphImageUrl: "/opengraph-image",
    robotsDisallow: ["/admin", "/api", "/auth", "/giris", "/kayit", "/sifremi-unuttum", "/sifre-yenile", "/profil"],
    sitemapEnabled: true,
    sitemapIncludeTags: true,
    sitemapIncludeStaticPages: true,
    searchIndexable: false,
    structuredDataEnabled: true,
    googleVerification: "",
    bingVerification: "",
  },
  ads: { enabled: true, showToMembers: true, preRollEnabled: false, preRollSkipSeconds: 5, adsTxt: "" },
  community: {
    registrationsEnabled: true,
    usernameMinLength: 3,
    usernameMaxLength: 29,
    usernamePattern: "^[a-zA-Z0-9_][a-zA-Z0-9_-]*$",
    minimumAge: 0,
    profilePhotoEnabled: true,
    commentsEnabled: true,
    commentsRequireApproval: true,
    blockedWords: [],
    dailyCommentLimit: 20,
    ratingsEnabled: true,
    favoritesEnabled: true,
  },
  integrations: { googleAnalyticsId: "", googleTagManagerId: "", clarityProjectId: "", metaPixelId: "", consentModeEnabled: true },
  security: {
    uploadMaxMb: 5,
    allowedUploadMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"],
    iframeAllowlist: [],
    enforceIframeAllowlist: false,
  },
  system: {},
};

export function getDefaultSettings<S extends SettingsSection>(section: S): SettingsDataMap[S] {
  return structuredClone(DEFAULT_SETTINGS[section]);
}
