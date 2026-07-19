import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { recordAdminAudit } from "@/lib/admin-audit";
import { getCurrentProfile } from "@/lib/auth";
import { setAdminCategorySidebarVisibility } from "@/lib/db-categories";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const admin = await getCurrentProfile();
  if (admin?.role !== "admin" || admin.status !== "active") {
    return NextResponse.json({ message: "Bu işlem için yönetici girişi gerekli." }, { status: 401 });
  }
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const visible = body && typeof body === "object" && "visible" in body
    ? (body as { visible?: unknown }).visible
    : null;

  if (!UUID_PATTERN.test(id) || typeof visible !== "boolean") {
    return NextResponse.json({ message: "Kategori menü ayarı geçersiz." }, { status: 400 });
  }

  try {
    const slug = await setAdminCategorySidebarVisibility(id, visible);
    revalidatePath("/admin/categories");
    invalidatePublicContent({ kind: "categories", categorySlug: slug });
    await recordAdminAudit({
      actorProfileId: admin.id,
      action: "category.sidebar_visibility.update",
      targetType: "category",
      targetIds: [id],
      details: { visible },
    }).catch((error) => console.error("[category-sidebar-visibility] audit failed", error));

    return NextResponse.json({
      ok: true,
      message: visible ? "Kategori sol menüye eklendi." : "Kategori sol menüden kaldırıldı.",
    });
  } catch (error) {
    console.error("[category-sidebar-visibility] save failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Kategori menü ayarı kaydedilemedi." },
      { status: 400 },
    );
  }
}
