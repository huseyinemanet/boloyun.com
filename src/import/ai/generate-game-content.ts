import type { ParsedGame } from "@/import/parsers/types";
import { normalizeImportCategories } from "@/import/taxonomy/category-normalizer";

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
  if (!process.env.AI_API_KEY) {
    return {
      title_tr: input.originalTitle,
      short_description_tr: input.originalDescription || `${input.originalTitle} oyununu hemen başlat ve oyna.`,
      long_description_tr: `${input.originalTitle} için AI içerik üretimi bekleniyor. Bu metin admin onayından önce düzenlenmelidir.`,
      how_to_play_tr: input.originalHowToPlay || "Oyunu başlat, ekrandaki yönlendirmeleri takip et ve hedefleri tamamla.",
      controls_tr: input.originalControls,
      features_tr: ["Hızlı başlangıç", "Tarayıcıda oynanır", "Kısa oyun turları"],
      developer_tr: input.originalDeveloper ?? "",
      seo_title_tr: `${input.originalTitle} Oyna`,
      seo_description_tr: `${input.originalTitle} oyununu Türkçe açıklamalarla keşfet ve hemen oyna.`,
      tags_tr: input.originalTags,
      categories_tr: normalizeImportCategories(input.originalCategories, 8).map((category) => category.name),
    };
  }

  throw new Error("AI provider adaptörü henüz bağlanmadı. Çıktı strict JSON olacak şekilde provider katmanı eklenmeli.");
}
