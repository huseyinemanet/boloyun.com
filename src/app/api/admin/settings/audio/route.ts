import { NextResponse } from "next/server";
import { getSettingsSection } from "@/lib/db-settings";
import { uploadSiteAudioAsset } from "@/lib/r2";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { authorizeAdminRoute } from "@/lib/security/admin-route-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const access = await authorizeAdminRoute(request, { continuePath: "/admin/settings/audio" });
  if (!access.allowed) return access.response;
  try {
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
