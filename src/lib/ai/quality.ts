import type { GameTranslationInput, TranslatedGameContent } from "./types";

const REQUIRED_FIELDS: Array<keyof TranslatedGameContent> = [
  "short_description",
  "long_description",
  "how_to_play",
  "controls",
  "features",
  "seo_title",
  "seo_description",
];

const COMMON_ENGLISH_WORDS = /\b(the|and|with|your|you|game|play|collect|level|levels|score|enemy|enemies|use|move|jump|click|mouse|keyboard|this|that|from|into|will|must|can|try|complete)\b/gi;
const TURKISH_CHARS_OR_WORDS = /[çğıöşüÇĞİÖŞÜ]|\b(oyun|oyunu|başlat|hemen|nasıl|için|ile|ve|bu|şu|kontrol|puan|seviye|türkçe)\b/i;

export function parseTranslatedContent(raw: string): TranslatedGameContent {
  const parsed = JSON.parse(stripJsonFence(raw)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("AI çıktısı JSON nesnesi değil.");
  const record = parsed as Record<string, unknown>;
  const output: TranslatedGameContent = {
    short_description: readString(record, "short_description"),
    long_description: readString(record, "long_description"),
    how_to_play: readString(record, "how_to_play"),
    controls: readStringArray(record, "controls"),
    features: readStringArray(record, "features"),
    seo_title: readString(record, "seo_title"),
    seo_description: readString(record, "seo_description"),
  };
  return output;
}

export function normalizeTranslatedContent(input: GameTranslationInput, output: TranslatedGameContent): TranslatedGameContent {
  const seoTitle = normalizeSeoTitle(input.title, output.seo_title);
  const seoDescription = normalizeSeoDescription(input.title, output.seo_description, output.short_description);

  return {
    ...output,
    seo_title: seoTitle,
    seo_description: seoDescription,
    controls: output.controls.length > 0 || input.controls.length > 0 ? output.controls : ["Kontroller oyun içinde gösterilir."],
    features: output.features.length > 0 || input.features.length > 0 ? output.features : ["Kolayca başlayabileceğin sade ve eğlenceli oynanış."],
  };
}

export function validateTranslatedContent(input: GameTranslationInput, output: TranslatedGameContent, options: { skipTitleCheck?: boolean } = {}) {
  for (const field of REQUIRED_FIELDS) {
    const value = output[field];
    if (Array.isArray(value)) {
      if (value.length === 0 || value.some((item) => item.trim().length < 2)) throw new Error(`${field} boş olamaz.`);
    } else if (value.trim().length < 10) {
      throw new Error(`${field} çok kısa.`);
    }
  }

  if (!options.skipTitleCheck && !keepsTitle(input.title, output.seo_title)) {
    throw new Error("AI çıktısı oyun adını SEO başlığında korumuyor.");
  }

  const text = [
    output.short_description,
    output.long_description,
    output.how_to_play,
    output.seo_title,
    output.seo_description,
    ...output.controls,
    ...output.features,
  ].join(" ");
  if (looksMostlyEnglish(text)) throw new Error("AI çıktısı hâlâ İngilizce ağırlıklı görünüyor.");
}

export function looksMostlyEnglish(value: string) {
  const text = value.trim();
  if (!text) return true;
  const englishMatches = text.match(COMMON_ENGLISH_WORDS)?.length ?? 0;
  const hasTurkishSignal = TURKISH_CHARS_OR_WORDS.test(text);
  return englishMatches >= 12 && !hasTurkishSignal;
}

function keepsTitle(title: string, seoTitle: string) {
  const cleanTitle = title.trim().toLocaleLowerCase("tr-TR");
  if (!cleanTitle) return true;
  return seoTitle.toLocaleLowerCase("tr-TR").includes(cleanTitle);
}

function normalizeSeoTitle(title: string, seoTitle: string) {
  const trimmed = seoTitle.trim();
  if (trimmed.length >= 10 && keepsTitle(title, trimmed)) return trimmed;
  return `${title.trim()} Oyna`;
}

function normalizeSeoDescription(title: string, seoDescription: string, shortDescription: string) {
  const trimmed = seoDescription.trim();
  if (trimmed.length >= 10) return trimmed;

  const fallback = shortDescription.trim();
  if (fallback.length >= 10) return fallback;

  return `${title.trim()} oyununu Bol Oyun'da ücretsiz keşfet ve hemen oyna.`;
}

function readString(record: Record<string, unknown>, key: keyof TranslatedGameContent) {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`${key} metin olmalı.`);
  return value.trim();
}

function readStringArray(record: Record<string, unknown>, key: keyof TranslatedGameContent) {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${key} metin listesi olmalı.`);
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function stripJsonFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}
