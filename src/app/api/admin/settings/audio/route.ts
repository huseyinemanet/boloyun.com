import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getSettingsSection } from "@/lib/db-settings";
import { uploadSiteAudioAsset } from "@/lib/r2";
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
    if (!(file instanceof File)) return NextResponse.json({ error: "Ses dosyası seçilmedi." }, { status: 400 });

    const { value: security } = await getSettingsSection("security");
    const asset = await uploadSiteAudioAsset(file, security.uploadMaxMb);
    return NextResponse.json({ url: asset.url });
  } catch (error) {
    console.error("Admin audio upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ses dosyası yüklenemedi." }, { status: 400 });
  }
}
