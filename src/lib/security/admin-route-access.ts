import { NextResponse } from "next/server";
import { evaluateAdminAccess, type CurrentProfile } from "@/lib/auth";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { adminMfaPath } from "@/lib/security/admin-mfa";

type AdminRouteAccess =
  | { allowed: true; admin: CurrentProfile }
  | { allowed: false; response: NextResponse };

type AdminRouteOptions = {
  mode?: "json" | "redirect";
  continuePath?: string;
};

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function authorizeAdminRoute(
  request: Request,
  { mode = "json", continuePath = "/admin" }: AdminRouteOptions = {},
): Promise<AdminRouteAccess> {
  const decision = await evaluateAdminAccess();
  if (decision.allowed) return decision;

  const continueUrl = decision.reason === "mfa_required" ? adminMfaPath(continuePath) : undefined;
  if (mode === "redirect") {
    const destination = decision.reason === "mfa_required"
      ? continueUrl ?? adminMfaPath(continuePath)
      : decision.reason === "auth_unavailable"
        ? `/giris?error=config&next=${encodeURIComponent(continuePath)}`
        : `/giris?next=${encodeURIComponent(continuePath)}`;
    const response = NextResponse.redirect(publicUrlFromRequest(request, destination), 303);
    for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
    return { allowed: false, response };
  }

  const failure = adminFailure(decision.reason, continueUrl);
  return {
    allowed: false,
    response: NextResponse.json(failure.body, { status: failure.status, headers: privateHeaders }),
  };
}

function adminFailure(reason: Exclude<Awaited<ReturnType<typeof evaluateAdminAccess>>, { allowed: true }>["reason"], continueUrl?: string) {
  if (reason === "unauthenticated") {
    const message = "Giriş yapmanız gerekiyor.";
    return { status: 401, body: { error: message, message, code: "unauthenticated" } };
  }
  if (reason === "forbidden") {
    const message = "Bu işlem için yetkiniz yok.";
    return { status: 403, body: { error: message, message, code: "forbidden" } };
  }
  if (reason === "mfa_required") {
    const message = "Devam etmek için yönetici MFA doğrulaması gerekiyor.";
    return { status: 403, body: { error: message, message, code: "admin_mfa_required", continueUrl } };
  }
  const message = "Kimlik doğrulama hizmetine şu anda ulaşılamıyor.";
  return { status: 503, body: { error: message, message, code: "auth_unavailable" } };
}
