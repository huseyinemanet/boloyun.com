import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export type PublicContentChange =
  | { kind: "game"; slug: string; categorySlugs?: string[]; tagSlugs?: string[]; affectsHomepage?: boolean }
  | { kind: "published-game"; slug?: string; categorySlugs?: string[]; tagSlugs?: string[] }
  | { kind: "approved-comment"; gameSlug: string }
  | { kind: "comments"; gameSlug?: string }
  | { kind: "categories"; categorySlug?: string }
  | { kind: "tags"; tagSlug?: string }
  | { kind: "ads" }
  | { kind: "public-shell" }
  | { kind: "static-page"; slug: string };

/**
 * Public cache invalidation has one owner so ordinary interactions never
 * accidentally evict the whole website. Votes, favorites and play events do
 * not belong here: their optimistic/private state is deliberately uncached.
 */
export function invalidatePublicContent(change: PublicContentChange) {
  switch (change.kind) {
    case "game":
      revalidateTag("games", "max");
      revalidatePath(`/oyun/${change.slug}`);
      invalidateTaxonomyPaths(change.categorySlugs, change.tagSlugs);
      if (change.affectsHomepage) {
        revalidateTag("homepage-sections", "max");
        revalidatePath("/");
      }
      return;
    case "published-game":
      revalidateTag("games", "max");
      revalidateTag("homepage-sections", "max");
      revalidatePath("/");
      if (change.slug) revalidatePath(`/oyun/${change.slug}`);
      invalidateTaxonomyPaths(change.categorySlugs, change.tagSlugs);
      return;
    case "approved-comment":
      revalidateTag("comments", "max");
      revalidatePath(`/oyun/${change.gameSlug}`);
      return;
    case "comments":
      revalidateTag("comments", "max");
      if (change.gameSlug) revalidatePath(`/oyun/${change.gameSlug}`);
      return;
    case "categories":
      revalidateTag("categories", "max");
      revalidateTag("public-shell", "max");
      revalidatePath("/kategoriler");
      if (change.categorySlug) revalidatePath(`/kategori/${change.categorySlug}`);
      return;
    case "tags":
      revalidateTag("tags", "max");
      if (change.tagSlug) revalidatePath(`/etiket/${change.tagSlug}`);
      return;
    case "ads":
      revalidateTag("ads", "max");
      revalidateTag("public-shell", "max");
      return;
    case "public-shell":
      revalidateTag("public-shell", "max");
      revalidateTag("site-settings", "max");
      revalidatePath("/", "layout");
      return;
    case "static-page":
      revalidateTag("static-pages", "max");
      revalidatePath(`/sayfa/${change.slug}`);
  }
}

function invalidateTaxonomyPaths(categorySlugs: string[] = [], tagSlugs: string[] = []) {
  for (const slug of new Set(categorySlugs.filter(Boolean))) revalidatePath(`/kategori/${slug}`);
  for (const slug of new Set(tagSlugs.filter(Boolean))) revalidatePath(`/etiket/${slug}`);
}
