import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getPublicSettings } from "@/lib/db-settings";
import { deleteSiteAsset, uploadSiteAsset } from "@/lib/r2";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    if (profile.status !== "active") return NextResponse.json({ error: "Hesabınız aktif değil." }, { status: 403 });
    const ip = await getClientIp();
    const rate = await consumeRateLimits([
      { action: "avatar-ip", subject: ip, limit: 10, windowSeconds: 3600 },
      { action: "avatar-user", subject: profile.id, limit: 5, windowSeconds: 3600 },
    ]);
    if (!rate.allowed) return NextResponse.json({ error: "Çok sık yükleme yaptınız. Lütfen daha sonra tekrar deneyin." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const { community, security } = await getPublicSettings();
    if (!community.profilePhotoEnabled) return NextResponse.json({ error: "Profil fotoğrafı yükleme kapalı." }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
    const asset = await uploadSiteAsset(file, "avatar", security.allowedUploadMimeTypes, security.uploadMaxMb);
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("Supabase bağlantısı yapılandırılmamış.");
    const { data: oldAsset } = await supabase.from("media_assets").select("id, storage_key").eq("owner_profile_id", profile.id).eq("kind", "avatar").eq("status", "active").maybeSingle();
    const { data: media, error: mediaError } = await supabase.from("media_assets").insert({ owner_profile_id: profile.id, kind: "avatar", storage_key: asset.key, public_url: asset.url, mime_type: asset.mimeType, byte_size: asset.bytes, width: asset.width, height: asset.height, content_hash: asset.sha256, status: "orphaned" }).select("id").single();
    if (mediaError || !media) {
      await deleteSiteAsset(asset.key).catch(() => undefined);
      throw new Error(mediaError?.message ?? "Medya kaydı oluşturulamadı.");
    }
    const { error } = await supabase.from("profiles").update({ avatar_url: asset.url, updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (error) {
      await supabase.from("media_assets").delete().eq("id", media.id);
      await deleteSiteAsset(asset.key).catch(() => undefined);
      throw new Error(error.message);
    }
    const { error: activateError } = await supabase.from("media_assets").update({ status: "active" }).eq("id", media.id);
    if (activateError) console.error("Avatar media activation failed", { mediaId: media.id });
    if (oldAsset?.storage_key) {
      const { error: tombstoneError } = await supabase.from("media_assets").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("id", oldAsset.id);
      if (tombstoneError) console.error("Old avatar tombstone failed", { mediaId: oldAsset.id });
      try { await deleteSiteAsset(oldAsset.storage_key); } catch { await supabase.from("media_assets").update({ status: "orphaned", deleted_at: null }).eq("id", oldAsset.id); }
    }
    revalidatePath("/profil");
    revalidatePath("/", "layout");
    return NextResponse.json({ url: asset.url });
  } catch (error) {
    console.error("Avatar upload failed", error);
    return NextResponse.json({ error: "Profil fotoğrafı yüklenemedi. Dosya türünü ve boyutunu kontrol edin." }, { status: 400 });
  }
}
