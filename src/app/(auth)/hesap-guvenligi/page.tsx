import { redirect } from "next/navigation";
import { AuthCard } from "../auth-card";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminMfaSatisfied } from "@/lib/security/admin-mfa";
import { safeLocalPath } from "@/lib/security/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMfaForm } from "./admin-mfa-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AccountSecurityPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?next=/hesap-guvenligi");
  if (profile.status !== "active") redirect("/giris?error=blocked");
  if (profile.role !== "admin") redirect("/profil");

  const requestedNext = safeLocalPath((await searchParams).next, "/admin");
  const next = requestedNext.startsWith("/admin") ? requestedNext : "/admin";
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/giris?error=config");

  const [assurance, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (isAdminMfaSatisfied(assurance.data?.currentLevel)) redirect(next);

  const verifiedFactorId = factors.data?.totp[0]?.id ?? null;

  return (
    <AuthCard
      title="Admin Güvenlik Doğrulaması"
      description={verifiedFactorId
        ? "Admin paneline devam etmek için doğrulama uygulamandaki kodu gir."
        : "Admin hesabını korumak için bir doğrulama uygulamasıyla iki aşamalı güvenliği kur."}
    >
      <AdminMfaForm next={next} verifiedFactorId={verifiedFactorId} />
    </AuthCard>
  );
}
