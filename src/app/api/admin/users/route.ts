import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { createAdminUser } from "@/lib/db-users";
import { normalizeAdminUserCreateValues, validateAdminUserCreateValues } from "@/lib/admin-user-create-validation";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const values = normalizeAdminUserCreateValues(input);
  const fieldErrors = validateAdminUserCreateValues(values);

  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      { message: "Lütfen işaretli alanları kontrol edin.", fieldErrors, values },
      { status: 400 },
    );
  }

  try {
    const authUserId = await createAdminUser({
      email: values.email,
      password: values.password,
      username: values.username,
      firstName: values.first_name,
      lastName: values.last_name,
      displayName: values.display_name,
      role: values.role,
    });

    await recordAdminAudit({
      actorProfileId: admin.id,
      action: "user.create",
      targetType: "auth_user",
      details: { authUserId, role: values.role },
    });

    revalidatePath("/admin/users");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.", fieldErrors: {}, values },
      { status: 400 },
    );
  }
}
