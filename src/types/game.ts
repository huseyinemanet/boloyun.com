export type GameType = "iframe" | "swf" | "html5" | "external";
export type PublishStatus = "draft" | "published" | "inactive";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
};

export type Game = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  howToPlay: string;
  controls: string[];
  features: string[];
  developer?: string;
  thumbnailUrl: string;
  gameType: GameType;
  embedUrl?: string;
  swfUrl?: string;
  html5Url?: string;
  externalUrl?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  status: PublishStatus;
  ratingAvg: number;
  ratingCount: number;
  likesCount: number;
  dislikesCount: number;
  playCount: number;
  categories: string[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  primaryCategoryId?: string;
  ogImageUrl?: string;
  isIndexable: boolean;
  isBroken: boolean;
};

export type GameSearchSuggestion = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  shortDescription: string;
};

export type HomepageSection = {
  id: string;
  title: string;
  sectionType:
    | "manual_games"
    | "latest_games"
    | "popular_games"
    | "trending_games"
    | "category_based"
    | "tag_based"
    | "continue_playing"
    | "favorites"
    | "random_picks";
  gameSlugs: string[];
  visibility: "all" | "logged_in_only" | "logged_out_only" | "desktop_only" | "mobile_only";
};
