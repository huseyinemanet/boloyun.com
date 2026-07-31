import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getSettingsSection } from "@/lib/db-settings";
import { uploadSiteAsset } from "@/lib/r2";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
    if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (!(file instanceof File)) return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
    if (kind !== "favicon" && kind !== "cover") return NextResponse.json({ error: "Geçersiz görsel alanı." }, { status: 400 });
    const [{ value: security }, { value: media }] = await Promise.all([
      getSettingsSection("security"),
      getSettingsSection("media"),
    ]);
    const asset = await uploadSiteAsset(file, kind, security.allowedUploadMimeTypes, security.uploadMaxMb, { organizeByDate: media.organizeUploadsByDate });
    return NextResponse.json({ url: asset.url });
  } catch (error) {
    console.error("Admin asset upload failed", error);
    return NextResponse.json({ error: "Dosya yüklenemedi. Tür ve boyut sınırlarını kontrol edin." }, { status: 400 });
  }
}
