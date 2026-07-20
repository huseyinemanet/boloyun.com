import assert from "node:assert/strict";
import test from "node:test";
import { auditGameSeo, isTagIndexable } from "@/lib/seo/audit";
import { breadcrumbJsonLd, videoGameJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, buildMetadata } from "@/lib/seo/metadata";

const completeGame = {
  title: "Deneme Oyunu",
  slug: "deneme-oyunu",
  seoTitle: "Deneme Oyunu Oyna",
  seoDescription: "Deneme oyununu ücretsiz oyna.",
  thumbnailUrl: "https://cdn.example.com/deneme.webp",
  shortDescription: "Kısa ve yararlı açıklama.",
  howToPlay: "Oyunu başlat ve hedefleri tamamla.",
  controls: ["Yön tuşları"],
  primaryCategoryId: "kategori-id",
  tags: ["aksiyon", "beceri"],
  gameType: "iframe" as const,
  embedUrl: "https://games.example.com/embed/deneme",
};

test("complete game passes all fourteen SEO checks", () => {
  const audit = auditGameSeo(completeGame);
  assert.equal(audit.publishable, true);
  assert.equal(audit.score, 14);
  assert.equal(audit.total, 14);
});

test("game type requires its matching playable URL", () => {
  const audit = auditGameSeo({ ...completeGame, gameType: "swf", embedUrl: null, swfUrl: null });
  assert.equal(audit.publishable, false);
  assert.ok(audit.criticalErrors.includes("Oynatılabilir kaynak"));
});

test("tag needs editor approval, five games and complete metadata", () => {
  assert.equal(isTagIndexable({ requested: true, publishedGameCount: 5, seoTitle: "Kaçış Oyunları", seoDescription: "Kaçış oyunlarını oyna." }), true);
  assert.equal(isTagIndexable({ requested: true, publishedGameCount: 4, seoTitle: "Kaçış Oyunları", seoDescription: "Kaçış oyunlarını oyna." }), false);
  assert.equal(isTagIndexable({ requested: false, publishedGameCount: 10, seoTitle: "Kaçış Oyunları", seoDescription: "Kaçış oyunlarını oyna." }), false);
});

test("metadata uses boloyun canonical and noindex when requested", () => {
  const metadata = buildMetadata({ title: "Oyun Ara", description: "Oyun ara.", canonicalPath: "/arama", indexable: false });
  assert.equal(metadata.alternates?.canonical, absoluteUrl("/arama"));
  assert.equal(typeof metadata.robots, "object");
  assert.equal((metadata.robots as { index?: boolean }).index, false);
});

test("VideoGame JSON-LD only exposes real developer and rating", () => {
  const withoutRating = videoGameJsonLd({ name: "Oyun", description: "Açıklama", image: "/logo.svg", path: "/oyun/oyun", genres: [] });
  assert.equal("author" in withoutRating, false);
  assert.equal("aggregateRating" in withoutRating, false);
  const withRating = videoGameJsonLd({ name: "Oyun", description: "Açıklama", image: "/logo.svg", path: "/oyun/oyun", genres: ["Aksiyon"], developer: "Stüdyo", ratingAvg: 4.2, ratingCount: 8 });
  assert.equal("author" in withRating, true);
  assert.equal("aggregateRating" in withRating, true);
});

test("breadcrumb JSON-LD exposes ordered absolute URLs for rich results", () => {
  const schema = breadcrumbJsonLd([
    { name: "Ana Sayfa", path: "/" },
    { name: "3D Oyunlar", path: "/kategori/3d-oyunlar" },
    { name: "CS Portable", path: "/oyun/cs-portable" },
  ]);

  assert.equal(schema["@type"], "BreadcrumbList");
  assert.deepEqual(schema.itemListElement, [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "3D Oyunlar", item: absoluteUrl("/kategori/3d-oyunlar") },
    { "@type": "ListItem", position: 3, name: "CS Portable", item: absoluteUrl("/oyun/cs-portable") },
  ]);
});
