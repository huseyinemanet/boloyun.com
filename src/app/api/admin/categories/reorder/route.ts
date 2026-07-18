import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { reorderAdminCategories } from "@/lib/db-categories";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = await getCurrentProfile();
  if (admin?.role !== "admin" || admin.status !== "active") {
    return NextResponse.json({ message: "Bu işlem için yönetici girişi gerekli." }, { status: 401 });
  }
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const categoryIds = body && typeof body === "object" && "categoryIds" in body
    ? (body as { categoryIds?: unknown }).categoryIds
    : null;

  if (
    !Array.isArray(categoryIds)
    || categoryIds.length === 0
    || categoryIds.length > 1000
    || categoryIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))
    || new Set(categoryIds).size !== categoryIds.length
  ) {
    return NextResponse.json({ message: "Kategori sırası geçersiz." }, { status: 400 });
  }

  try {
    await reorderAdminCategories(categoryIds);
    revalidatePath("/admin/categories");
    invalidatePublicContent({ kind: "categories" });
    await recordAdminAudit({
      actorProfileId: admin.id,
      action: "category.reorder",
      targetType: "category",
      details: { categoryCount: categoryIds.length },
    }).catch((error) => console.error("[category-reorder] audit failed", error));

    return NextResponse.json({ ok: true, message: "Kategori sırası kaydedildi." });
  } catch (error) {
    console.error("[category-reorder] save failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Kategori sırası kaydedilemedi." },
      { status: 400 },
    );
  }
}
