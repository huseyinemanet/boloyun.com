import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePopularityScore,
  mapGameRow,
  mapTaxonomyItems,
  mapTaxonomyRows,
  normalizeGameIds,
  prioritizeTaxonomy,
  rankRelatedGameCandidates,
  restoreRequestedGameOrder,
  sortPopularGames,
  type AdminPopularGame,
  type GameRow,
} from "./model";

function gameRow(overrides: Partial<GameRow> = {}): GameRow {
  return {
    id: "game-1",
    title: "Deneme Oyunu",
    slug: "deneme-oyunu",
    short_description: "Kısa açıklama",
    long_description: "Uzun açıklama",
    how_to_play: "Özgün oynanış metni",
    controls: ["Yön tuşları"],
    features: ["Tek oyunculu"],
    developer: "Stüdyo",
    thumbnail_url: "site-assets/cover/game-1.webp",
    game_type: "iframe",
    embed_url: "https://example.com/game",
    swf_url: null,
    html5_url: null,
    external_url: null,
    source_url: "https://example.com/source",
    source_domain: "example.com",
    status: "published",
    rating_avg: 4.5,
    rating_count: 8,
    likes_count: 12,
    dislikes_count: 2,
    play_count: 120,
    seo_title: "Deneme Oyunu Oyna",
    seo_description: "SEO açıklaması",
    primary_category_id: "category-1",
    og_image_url: "/og/game-1.webp",
    is_indexable: true,
    is_broken: false,
    ...overrides,
  };
}

test("mapGameRow maps database fields and normalizes the thumbnail", () => {
  const game = mapGameRow(gameRow());

  assert.equal(game.shortDescription, "Kısa açıklama");
  assert.equal(game.longDescription, "Uzun açıklama");
  assert.equal(game.thumbnailUrl, "/site-assets/cover/game-1.webp");
  assert.equal(game.gameType, "iframe");
  assert.equal(game.embedUrl, "https://example.com/game");
  assert.equal(game.ratingAvg, 4.5);
  assert.equal(game.primaryCategoryId, "category-1");
  assert.equal(game.isIndexable, true);
});

test("mapGameRow preserves unique how-to-play copy", () => {
  assert.equal(mapGameRow(gameRow()).howToPlay, "Özgün oynanış metni");
});

test("mapGameRow replaces empty or duplicate how-to-play copy with existing fallbacks", () => {
  const withControls = mapGameRow(gameRow({ how_to_play: "Kısa açıklama" }));
  assert.match(withControls.howToPlay, /Kontroller: Yön tuşları\./);

  const withoutControls = mapGameRow(gameRow({ how_to_play: null, controls: null }));
  assert.match(withoutControls.howToPlay, /Oyunu Başlat butonuna bas/);
});

test("mapGameRow keeps established null defaults", () => {
  const game = mapGameRow(gameRow({
    short_description: null,
    long_description: null,
    controls: null,
    features: null,
    developer: null,
    thumbnail_url: null,
    rating_avg: null,
    rating_count: null,
    likes_count: null,
    dislikes_count: null,
    play_count: null,
    seo_title: null,
    seo_description: null,
    is_indexable: null,
    is_broken: null,
  }));

  assert.equal(game.shortDescription, "");
  assert.equal(game.longDescription, "");
  assert.deepEqual(game.controls, []);
  assert.deepEqual(game.features, []);
  assert.equal(game.thumbnailUrl, "/thumbnails/space.svg");
  assert.equal(game.ratingAvg, 0);
  assert.equal(game.seoTitle, "Deneme Oyunu Oyna");
  assert.equal(game.isIndexable, true);
  assert.equal(game.isBroken, false);
});

test("taxonomy helpers support Supabase object and array relations and remove duplicates", () => {
  const rows = mapTaxonomyRows([
    { categories: { id: "category-2", name: "Spor", slug: "spor" } },
    { categories: [{ id: "category-1", name: "Aksiyon", slug: "aksiyon" }] },
    { categories: { id: "duplicate", name: "Spor", slug: "spor" } },
  ], "categories");
  const items = mapTaxonomyItems([
    { id: "tag-1", name: "Araba", slug: "araba" },
    { id: "tag-2", name: "Araba", slug: "araba" },
  ]);

  assert.deepEqual(rows.map(({ id, slug }) => ({ id, slug })), [
    { id: "category-2", slug: "spor" },
    { id: "category-1", slug: "aksiyon" },
  ]);
  assert.equal(items.length, 1);
  assert.equal(prioritizeTaxonomy(rows, "category-1")[0]?.id, "category-1");
});

test("game ID helpers deduplicate cache keys and preserve requested result order", () => {
  const first = mapGameRow(gameRow({ id: "a", slug: "a" }));
  const second = mapGameRow(gameRow({ id: "b", slug: "b" }));

  assert.deepEqual(normalizeGameIds(["b", "a", "b", ""]), ["a", "b"]);
  assert.deepEqual(restoreRequestedGameOrder(["b", "a", "b"], [first, second]).map((game) => game.id), ["b", "a", "b"]);
});

test("related ranking favors multiple specific overlaps over one broad category", () => {
  const ranked = rankRelatedGameCandidates({
    primaryCategoryId: "3d",
    categoryLinks: [
      { gameId: "racing-game", taxonomyId: "3d" },
      { gameId: "racing-game", taxonomyId: "car" },
      { gameId: "racing-game", taxonomyId: "racing" },
      { gameId: "dress-up-game", taxonomyId: "3d" },
      { gameId: "other-3d-game", taxonomyId: "3d" },
    ],
    tagLinks: [
      { gameId: "racing-game", taxonomyId: "driving" },
      { gameId: "racing-game", taxonomyId: "sports-car" },
      { gameId: "dress-up-game", taxonomyId: "browser-game" },
      { gameId: "other-3d-game", taxonomyId: "browser-game" },
    ],
  });

  assert.equal(ranked[0]?.id, "racing-game");
  assert.ok((ranked[0]?.score ?? 0) > (ranked.find((item) => item.id === "dress-up-game")?.score ?? 0));
});

test("popularity calculation uses diminishing returns and engagement confidence", () => {
  const score = calculatePopularityScore({
    playCount: 100,
    favoriteCount: 2,
    likesCount: 3,
    dislikesCount: 1,
    ratingAvg: 4,
    ratingCount: 5,
  });
  assert.ok(Math.abs(score - 201.492747) < 0.00001);
  assert.ok(calculatePopularityScore({
    playCount: 100,
    favoriteCount: 3,
    likesCount: 3,
    dislikesCount: 1,
    ratingAvg: 4,
    ratingCount: 5,
  }) > score);

  const base = {
    id: "a",
    slug: "a",
    categoryName: "",
    thumbnailUrl: "",
    favoriteCount: 0,
    likesCount: 0,
    dislikesCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    popularityScore: 10,
  } satisfies Omit<AdminPopularGame, "title" | "playCount">;
  const games: AdminPopularGame[] = [
    { ...base, id: "b", slug: "b", title: "Beta", playCount: 2 },
    { ...base, title: "Alfa", playCount: 2 },
    { ...base, id: "c", slug: "c", title: "Gama", playCount: 3 },
  ];

  assert.deepEqual(games.toSorted(sortPopularGames).map((game) => game.title), ["Gama", "Alfa", "Beta"]);
});
