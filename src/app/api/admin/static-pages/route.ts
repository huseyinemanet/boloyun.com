import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { saveAdminStaticPage } from "@/lib/db-static-pages";
import {
  adminStaticPageValuesToFormData,
  normalizeAdminStaticPageValues,
  validateAdminStaticPageValues,
} from "@/lib/admin-static-page-validation";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { recordAdminAudit } from "@/lib/admin-audit";
import { authorizeAdminRoute } from "@/lib/security/admin-route-access";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ message: "Geçersiz istek kaynağı." }, { status: 403 });
  const access = await authorizeAdminRoute(request, { continuePath: "/admin/static-pages" });
  if (!access.allowed) return access.response;
  const body = await request.json().catch(() => ({}));
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const values = normalizeAdminStaticPageValues(input);
  const fieldErrors = validateAdminStaticPageValues(values);

  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      { message: "Lütfen işaretli alanları kontrol edin.", fieldErrors, values },
      { status: 400 },
    );
  }

  try {
    await saveAdminStaticPage(adminStaticPageValuesToFormData(values));
    await recordAdminAudit({
      actorProfileId: access.admin.id,
      action: values.id ? "static_page.update" : "static_page.create",
      targetType: "static_page",
      targetIds: values.id ? [values.id] : [],
      details: { slug: values.slug, title: values.title, status: values.status },
    }).catch((auditError) => console.error("[admin-audit] statik sayfa kaydı yazılamadı", auditError));
    revalidatePath("/admin/static-pages");
    revalidateTag("static-pages", "max");
    if (values.slug) revalidatePath(`/sayfa/${values.slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ ok: true, message: "Sayfa kaydedildi." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Sayfa kaydedilemedi.", fieldErrors: {}, values },
      { status: 400 },
    );
  }
}
