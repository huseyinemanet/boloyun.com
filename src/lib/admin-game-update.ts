import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { mirrorGameCover, isCdnCoverUrl } from "@/import/covers/mirror-cover";
import { getAdminGameById, updateAdminGame } from "@/lib/db-games";
import { auditGameSeo } from "@/lib/seo/audit";
import type { GameType, PublishStatus } from "@/types/game";

export async function updateAdminGameFromForm(id: string, formData: FormData) {
  if (!id) throw new Error("Oyun kimliği eksik.");

  const currentGame = await getAdminGameById(id);
  if (!currentGame) throw new Error("Oyun bulunamadı.");

  const input = {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    status: String(formData.get("status") ?? "draft") as PublishStatus,
    short_description: String(formData.get("short_description") ?? ""),
    long_description: String(formData.get("long_description") ?? ""),
    how_to_play: String(formData.get("how_to_play") ?? ""),
    controls: splitLines(String(formData.get("controls") ?? "")),
    features: splitLines(String(formData.get("features") ?? "")),
    developer: String(formData.get("developer") ?? ""),
    thumbnail_url: String(formData.get("thumbnail_url") ?? ""),
    game_type: String(formData.get("game_type") ?? "iframe") as GameType,
    embed_url: String(formData.get("embed_url") ?? ""),
    swf_url: String(formData.get("swf_url") ?? ""),
    html5_url: String(formData.get("html5_url") ?? ""),
    external_url: String(formData.get("external_url") ?? ""),
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? ""),
    primary_category_id: normalizeSelection(String(formData.get("primary_category_id") ?? "")),
    og_image_url: String(formData.get("og_image_url") ?? ""),
    is_indexable: formData.get("is_indexable") === "on",
    is_broken: formData.get("is_broken") === "on",
    category_ids: formData.getAll("category_ids").map(String).filter(Boolean),
    tags: splitTags(String(formData.get("tags") ?? "")),
  };

  const thumbnailChanged = input.thumbnail_url !== currentGame.thumbnailUrl;
  if (input.status === "published" && input.thumbnail_url && !isCdnCoverUrl(input.thumbnail_url)) {
    const mirrored = await mirrorGameCover(input.thumbnail_url);
    Object.assign(input, {
      thumbnail_source_url: input.thumbnail_url,
      thumbnail_url: mirrored.publicUrl,
      thumbnail_r2_key: mirrored.r2Key,
      thumbnail_sync_status: "synced" as const,
      thumbnail_sync_error: null,
      thumbnail_synced_at: new Date().toISOString(),
    });
  } else if (thumbnailChanged) {
    const cdnCover = isCdnCoverUrl(input.thumbnail_url);
    Object.assign(input, {
      thumbnail_source_url: input.thumbnail_url || null,
      thumbnail_r2_key: null,
      thumbnail_sync_status: cdnCover ? "synced" as const : "pending" as const,
      thumbnail_sync_error: null,
      thumbnail_synced_at: cdnCover ? new Date().toISOString() : null,
    });
  } else {
    Object.assign(input, {
      thumbnail_source_url: currentGame.thumbnailSourceUrl ?? currentGame.thumbnailUrl ?? null,
      thumbnail_r2_key: currentGame.thumbnailR2Key ?? null,
      thumbnail_sync_status: currentGame.thumbnailSyncStatus ?? (isCdnCoverUrl(currentGame.thumbnailUrl) ? "synced" : "pending"),
      thumbnail_sync_error: currentGame.thumbnailSyncError ?? null,
      thumbnail_synced_at: currentGame.thumbnailSyncedAt ?? null,
    });
  }

  if (input.status === "published" && currentGame.status !== "published") {
    const audit = auditGameSeo({
      title: input.title,
      slug: input.slug,
      seoTitle: input.seo_title,
      seoDescription: input.seo_description,
      thumbnailUrl: input.thumbnail_url,
      shortDescription: input.short_description,
      howToPlay: input.how_to_play,
      controls: input.controls,
      primaryCategoryId: input.primary_category_id,
      tags: input.tags,
      gameType: input.game_type,
      embedUrl: input.embed_url,
      swfUrl: input.swf_url,
      html5Url: input.html5_url,
      externalUrl: input.external_url,
    });
    if (!audit.publishable) throw new Error(`Oyun yayınlanamaz. Eksikler: ${audit.criticalErrors.join(", ")}`);
  }

  if (input.status !== "published" || input.is_broken) input.is_indexable = false;
  await updateAdminGame(id, input);

  revalidatePath("/");
  revalidateTag("games", "max");
  revalidateTag("categories", "max");
  revalidateTag("tags", "max");
  revalidatePath("/admin/games");
}

function splitTags(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeSelection(value: string) {
  return value === "none" ? "" : value;
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
