import type { GameType } from "@/types/game";

export type ParsedGame = {
  sourceUrl: string;
  sourceDomain: string;
  originalTitle: string;
  originalDescription: string;
  originalHowToPlay?: string;
  originalControls: string[];
  originalDeveloper?: string;
  originalCategories: string[];
  originalTags: string[];
  thumbnailUrl?: string;
  detectedGameType: GameType;
  detectedEmbedUrl?: string;
  detectedSwfUrl?: string;
  detectedHtml5Url?: string;
  detectedExternalUrl?: string;
  rawHtmlSnapshot?: string;
};
