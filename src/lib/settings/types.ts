export const SETTINGS_SECTIONS = [
  "general",
  "appearance",
  "games",
  "seo",
  "ads",
  "community",
  "integrations",
  "security",
  "system",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type GeneralSettings = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  locale: "tr-TR";
  timezone: string;
  maintenanceMode: boolean;
  registrationsEnabled: boolean;
  logoUrl: string;
  faviconUrl: string;
  defaultCoverUrl: string;
};

export type AppearanceSettings = {
  heroTitle: string;
  heroDescription: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementUrl: string;
};

export type GameSettings = {
  playerAspectRatio: "16:9" | "4:3";
  allowFullscreen: boolean;
  loadTimeoutSeconds: number;
  allowGuestPlay: boolean;
  showPlayCount: boolean;
  likesEnabled: boolean;
  favoritesEnabled: boolean;
  sharingEnabled: boolean;
  similarGameStrategy: "taxonomy" | "category" | "popular";
};

export type SeoSettings = {
  defaultTitle: string;
  defaultTitleTemplate: string;
  defaultDescription: string;
  gameTitleTemplate: string;
  categoryTitleTemplate: string;
  categoryDescriptionTemplate: string;
  canonicalDomain: string;
  openGraphImageUrl: string;
  robotsDisallow: string[];
  sitemapEnabled: boolean;
  sitemapIncludeTags: boolean;
  sitemapIncludeStaticPages: boolean;
  searchIndexable: boolean;
  structuredDataEnabled: boolean;
  googleVerification: string;
  bingVerification: string;
};

export type AdSettings = {
  enabled: boolean;
  showToMembers: boolean;
  preRollEnabled: boolean;
  preRollSkipSeconds: number;
  adsTxt: string;
};

export type CommunitySettings = {
  registrationsEnabled: boolean;
  emailVerificationRequired: boolean;
  usernameMinLength: number;
  usernameMaxLength: number;
  usernamePattern: string;
  minimumAge: number;
  profilePhotoEnabled: boolean;
  commentsEnabled: boolean;
  commentsRequireApproval: boolean;
  blockedWords: string[];
  dailyCommentLimit: number;
  ratingsEnabled: boolean;
  favoritesEnabled: boolean;
};

export type IntegrationSettings = {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  clarityProjectId: string;
  metaPixelId: string;
  consentModeEnabled: boolean;
};

export type SecuritySettings = {
  uploadMaxMb: number;
  allowedUploadMimeTypes: string[];
  iframeAllowlist: string[];
  enforceIframeAllowlist: boolean;
};

export type SystemSettings = Record<string, never>;

export type SettingsDataMap = {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  games: GameSettings;
  seo: SeoSettings;
  ads: AdSettings;
  community: CommunitySettings;
  integrations: IntegrationSettings;
  security: SecuritySettings;
  system: SystemSettings;
};

export type SettingsRecord<S extends SettingsSection = SettingsSection> = {
  section: S;
  value: SettingsDataMap[S];
  version: number;
  updatedAt: string | null;
  updatedByLabel: string | null;
};

export type SettingsRevision = {
  id: string;
  section: SettingsSection;
  version: number;
  snapshot: Record<string, unknown>;
  changedKeys: string[];
  changedByLabel: string | null;
  restoredFromRevisionId: string | null;
  createdAt: string;
};

export type PublicSettings = {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  games: GameSettings;
  seo: SeoSettings;
  ads: AdSettings;
  community: CommunitySettings;
  integrations: IntegrationSettings;
  security: SecuritySettings;
};
