import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveAdminStaticPage } from "@/lib/db-static-pages";
import {
  adminStaticPageValuesToFormData,
  normalizeAdminStaticPageValues,
  validateAdminStaticPageValues,
} from "@/lib/admin-static-page-validation";

export async function POST(request: Request) {
  await requireAdmin();
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
