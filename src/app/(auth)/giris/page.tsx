import { SoundAnchor } from "@/components/audio/sound-anchor";
import { SoundLink } from "@/components/audio/sound-link";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { safeLocalPath } from "@/lib/security/navigation";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { AuthCard, AuthMessage } from "../auth-card";
import { Field, FieldSeparator } from "@/components/ui/field";

type Props = {
  searchParams: Promise<{ error?: string; notice?: string; next?: string; challenge?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, notice, next = "/", challenge } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) {
    const target = safeLocalPath(next === "/" ? "/profil" : next, "/profil");
    redirect(target === "/giris" || target === "/kayit" ? "/profil" : target);
  }
  const loginError = error ? getLoginError(error) : "";
  const hasFieldError = error === "invalid" || error === "form";

  return (
    <AuthCard title="Giriş Yap" description="Favorilerini, yorumlarını ve son oynadığın oyunları hesabında sakla.">
      {notice === "created" ? <AuthMessage type="success">Hesabın oluşturuldu. Şimdi giriş yapabilirsin.</AuthMessage> : null}
      {notice === "verify-email" ? <AuthMessage type="success">Hesabın oluşturuldu. E-postandaki doğrulama bağlantısını açtıktan sonra giriş yapabilirsin.</AuthMessage> : null}
      {notice === "password-updated" ? <AuthMessage type="success">Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</AuthMessage> : null}
      {error ? <AuthMessage id="login-form-error" type="error">{loginError}</AuthMessage> : null}

      <Field>
        <Button asChild variant="outline" className="h-10 w-full px-4 text-sm font-semibold">
          <SoundAnchor href={`/auth/google?next=${encodeURIComponent(next)}`} data-analytics-event="login_attempt" data-analytics-content-type="google" className="gap-2">
            <GoogleLogo className="size-4 shrink-0" />
            Google ile Giriş Yap
          </SoundAnchor>
        </Button>
      </Field>

      <FieldSeparator className="my-4">veya</FieldSeparator>

      <LoginForm next={next} challenge={challenge === "1"} hasServerFieldError={hasFieldError} />

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm font-semibold">
        <SoundLink href="/kayit" className="text-primary hover:underline">Kayıt Ol</SoundLink>
        <SoundLink href="/sifremi-unuttum" className="text-primary hover:underline">Şifremi Unuttum</SoundLink>
      </div>
    </AuthCard>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function getLoginError(error: string) {
  if (error === "blocked") return "Hesabın engellenmiş. Yardım için site yönetimiyle iletişime geç.";
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  if (error === "google") return "Google ile giriş başlatılamadı. Lütfen tekrar dene.";
  if (error === "challenge") return "Çok sayıda giriş denemesi algılandı. Lütfen bot doğrulamasını tamamla.";
  if (error === "form") return "Form gönderilemedi. Lütfen alanları tekrar doldur.";
  if (error === "profile") return "Hesabın açıldı ancak profil bilgileri hazırlanamadı. Lütfen tekrar dene.";
  if (error === "callback") return "Giriş bağlantısı geçersiz veya süresi dolmuş.";
  if (error === "invalid-link") return "E-posta bağlantısı geçersiz veya süresi dolmuş.";
  return "E-posta veya şifre hatalı.";
}
