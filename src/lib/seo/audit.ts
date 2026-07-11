import type { GameType } from "@/types/game";

export type SeoAuditInput = {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  thumbnailUrl: string;
  shortDescription: string;
  howToPlay: string;
  controls: string[];
  primaryCategoryId?: string | null;
  tags: string[];
  gameType: GameType;
  embedUrl?: string | null;
  swfUrl?: string | null;
  html5Url?: string | null;
  externalUrl?: string | null;
};

export type SeoAuditItem = {
  key: string;
  label: string;
  passed: boolean;
  critical: boolean;
};

export type SeoAuditResult = {
  score: number;
  total: number;
  publishable: boolean;
  items: SeoAuditItem[];
  criticalErrors: string[];
};

export function getPlayableSource(input: Pick<SeoAuditInput, "gameType" | "embedUrl" | "swfUrl" | "html5Url" | "externalUrl">) {
  if (input.gameType === "iframe") return clean(input.embedUrl);
  if (input.gameType === "swf") return clean(input.swfUrl);
  if (input.gameType === "html5") return clean(input.html5Url);
  return clean(input.externalUrl);
}

export function auditGameSeo(input: SeoAuditInput): SeoAuditResult {
  const title = clean(input.title);
  const slug = clean(input.slug);
  const thumbnail = clean(input.thumbnailUrl);
  const playableSource = getPlayableSource(input);
  const structuredDataValid = Boolean(title && slug && thumbnail && clean(input.shortDescription));
  const items: SeoAuditItem[] = [
    item("title", "Başlık", Boolean(title), true),
    item("slug", "Slug", Boolean(slug), true),
    item("seo_title", "SEO başlığı", Boolean(clean(input.seoTitle)), true),
    item("seo_description", "SEO açıklaması", Boolean(clean(input.seoDescription)), true),
    item("thumbnail", "Kapak görseli", Boolean(thumbnail), true),
    item("alt", "Görsel alt metni", Boolean(title && thumbnail), false),
    item("short_description", "Kısa açıklama", Boolean(clean(input.shortDescription)), true),
    item("how_to_play", "Nasıl oynanır", Boolean(clean(input.howToPlay)), true),
    item("controls", "Kontroller", input.controls.some(Boolean), false),
    item("primary_category", "Birincil kategori", Boolean(clean(input.primaryCategoryId)), true),
    item("tags", "En az iki etiket", input.tags.filter(Boolean).length >= 2, false),
    item("canonical", "Canonical URL", Boolean(slug), false),
    item("structured_data", "Yapılandırılmış veri", structuredDataValid, false),
    item("playable_source", "Oynatılabilir kaynak", Boolean(playableSource), true),
  ];
  const criticalErrors = items.filter((entry) => entry.critical && !entry.passed).map((entry) => entry.label);

  return {
    score: items.filter((entry) => entry.passed).length,
    total: items.length,
    publishable: criticalErrors.length === 0,
    items,
    criticalErrors,
  };
}

export function isTagIndexable({
  requested,
  publishedGameCount,
  seoTitle,
  seoDescription,
}: {
  requested: boolean;
  publishedGameCount: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
}) {
  return requested && publishedGameCount >= 5 && Boolean(clean(seoTitle) && clean(seoDescription));
}

function item(key: string, label: string, passed: boolean, critical: boolean): SeoAuditItem {
  return { key, label, passed, critical };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
