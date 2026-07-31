export const SETTINGS_SECTIONS = [
  "general",
  "appearance",
  "games",
  "seo",
  "ads",
  "community",
  "integrations",
  "media",
  "permalinks",
  "security",
  "audio",
  "system",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type GeneralSettings = {
  siteName: string;
  maintenanceMode: boolean;
  faviconUrl: string;
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
  usernameMinLength: number;
  usernameMaxLength: number;
  usernamePattern: string;
  minimumAge: number;
  profilePhotoEnabled: boolean;
  commentsEnabled: boolean;
  commentsRequireApproval: boolean;
  blockedWords: string[];
  dailyCommentLimit: number;
};

export type IntegrationSettings = {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  clarityProjectId: string;
  metaPixelId: string;
  consentModeEnabled: boolean;
};

export type MediaSettings = {
  organizeUploadsByDate: boolean;
};

export type PermalinkSettings = {
  gameBase: string;
  categoryBase: string;
  tagBase: string;
  pageBase: string;
  paginationBase: string;
};

export type SecuritySettings = {
  uploadMaxMb: number;
  allowedUploadMimeTypes: string[];
  iframeAllowlist: string[];
  enforceIframeAllowlist: boolean;
};

export type AudioSettings = {
  clickSoundEnabled: boolean;
  clickSoundUrl: string;
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
  media: MediaSettings;
  permalinks: PermalinkSettings;
  security: SecuritySettings;
  audio: AudioSettings;
  system: SystemSettings;
};

export type SettingsRecord<S extends SettingsSection = SettingsSection> = {
  section: S;
  value: SettingsDataMap[S];
  updatedAt: string | null;
  updatedByLabel: string | null;
};

export type PublicSettings = {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  games: GameSettings;
  seo: SeoSettings;
  ads: AdSettings;
  community: CommunitySettings;
  integrations: IntegrationSettings;
  media: MediaSettings;
  permalinks: PermalinkSettings;
  security: SecuritySettings;
  audio: AudioSettings;
};
