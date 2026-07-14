import type { ParsedGame } from "@/import/parsers/types";
import { normalizeImportCategories } from "@/import/taxonomy/category-normalizer";
import { getRuntimeConfig } from "@/lib/ai/db-ai";
import { translateGameContent } from "@/lib/ai/providers";
import type { GameTranslationInput } from "@/lib/ai/types";

export type GeneratedGameContent = {
  title_tr: string;
  short_description_tr: string;
  long_description_tr: string;
  how_to_play_tr: string;
  controls_tr: string[];
  features_tr: string[];
  developer_tr: string;
  seo_title_tr: string;
  seo_description_tr: string;
  tags_tr: string[];
  categories_tr: string[];
};

export async function generateGameContent(input: ParsedGame): Promise<GeneratedGameContent> {
  const config = await getRuntimeConfig("deepseek", { requireEnabled: true });
  const translated = await translateGameContent(buildTranslationInput(input), config);

  return {
    title_tr: input.originalTitle,
    short_description_tr: translated.short_description,
    long_description_tr: translated.long_description,
    how_to_play_tr: translated.how_to_play,
    controls_tr: translated.controls,
    features_tr: translated.features,
    developer_tr: input.originalDeveloper ?? "",
    seo_title_tr: translated.seo_title,
    seo_description_tr: translated.seo_description,
    tags_tr: uniqueClean(input.originalTags).slice(0, 16),
    categories_tr: normalizeImportCategories(input.originalCategories, 8).map((category) => category.name),
  };
}

function buildTranslationInput(input: ParsedGame): GameTranslationInput {
  const shortDescription = input.originalDescription || `${input.originalTitle} oyununu hemen başlat ve oyna.`;
  const longDescription = input.originalDescription || input.originalHowToPlay || `${input.originalTitle} tarayıcıda oynanabilen bir mini oyundur.`;
  const howToPlay = input.originalHowToPlay || "Oyunu başlat, ekrandaki yönergeleri takip et ve hedefleri tamamla.";
  const controls = input.originalControls.length > 0 ? input.originalControls : ["Kontroller oyun içinde gösterilir."];

  return {
    title: input.originalTitle,
    short_description: shortDescription,
    long_description: longDescription,
    how_to_play: howToPlay,
    controls,
    features: buildFeatureHints(input),
    seo_title: `${input.originalTitle} Oyna`,
    seo_description: `${input.originalTitle} oyununu Bol Oyun'da keşfet ve hemen oyna.`,
  };
}

function buildFeatureHints(input: ParsedGame) {
  const gameTypeFeature = input.detectedGameType === "swf"
    ? "Ruffle ile oynanır"
    : input.detectedGameType === "external"
      ? "Harici kaynak bağlantısı içerir"
      : "Tarayıcıda oynanır";
  return uniqueClean([
    gameTypeFeature,
    input.thumbnailUrl ? "Kapak görseli mevcut" : "",
    input.originalCategories[0] ? `${input.originalCategories[0]} kategorisinde` : "",
    "Oyunu Başlat butonu ile yüklenir",
  ]);
}

function uniqueClean(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
