import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeLocalPath } from "@/lib/security/navigation";

const allowedTypes = new Set<EmailOtpType>(["signup", "recovery", "email", "email_change"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextValue = request.nextUrl.searchParams.get("next") ?? "/";
  const next = safeLocalPath(nextValue);
  if (!tokenHash || !rawType || !allowedTypes.has(rawType)) return NextResponse.redirect(new URL("/giris?error=invalid-link", request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase?.auth.verifyOtp({ type: rawType, token_hash: tokenHash }) ?? { error: new Error("Supabase yapılandırılmamış.") };
  if (error) return NextResponse.redirect(new URL(rawType === "recovery" ? "/sifremi-unuttum?error=expired" : "/giris?error=invalid-link", request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
