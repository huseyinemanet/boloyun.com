import { SoundLink } from "@/components/audio/sound-link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { getPublicSettings } from "@/lib/db-settings";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthCard, AuthMessage } from "../auth-card";
import { ValidatedAuthForm, ValidatedInput } from "../validated-auth-form";

type Props = {
  searchParams: Promise<{ error?: string; challenge?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const { error, challenge } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) redirect("/profil");

  const { general, community } = await getPublicSettings();
  const registrationsEnabled = general.registrationsEnabled && community.registrationsEnabled;
  const registerError = error ? getRegisterError(error) : "";
  const errorDescription = error ? "register-form-error" : undefined;
  const hasUsernameError = error === "username" || error === "form" || error === "create";
  const hasEmailError = error === "email" || error === "form" || error === "create";
  const hasPasswordError = error === "email" || error === "form";
  const hasAgeError = error === "age" || error === "form";
  const hasTermsError = error === "terms" || error === "form";

  return (
    <AuthCard title="Kayıt Ol" description="Oyunlarını favorilere eklemek ve yorum yazmak için ücretsiz hesap oluştur.">
      {!registrationsEnabled ? <AuthMessage type="error">Yeni üyelikler şu anda kapalı. Mevcut hesabınla giriş yapabilirsin.</AuthMessage> : null}
      {error ? <AuthMessage id="register-form-error" type="error">{registerError}</AuthMessage> : null}
      {registrationsEnabled ? (
        <ValidatedAuthForm action="/auth/signup" className="mt-4">
          <BotProtectionFields challenge={challenge === "1"} action="signup" />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="register-username">Kullanıcı adı</FieldLabel>
              <ValidatedInput id="register-username" name="username" autoComplete="username" required minLength={community.usernameMinLength} maxLength={community.usernameMaxLength} serverInvalid={hasUsernameError} aria-describedby={hasUsernameError ? errorDescription : undefined} />
            </Field>
            {community.minimumAge > 0 ? (
              <Field>
                <FieldLabel htmlFor="register-birth-year">Doğum yılı</FieldLabel>
                <ValidatedInput id="register-birth-year" name="birth_year" type="number" autoComplete="bday-year" required min={1900} max={new Date().getFullYear() - community.minimumAge} serverInvalid={hasAgeError} aria-describedby={hasAgeError ? errorDescription : undefined} />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="register-email">E-posta</FieldLabel>
              <ValidatedInput id="register-email" name="email" type="email" autoComplete="email" required serverInvalid={hasEmailError} aria-describedby={hasEmailError ? errorDescription : undefined} />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-password">Şifre</FieldLabel>
              <ValidatedInput id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8} serverInvalid={hasPasswordError} aria-describedby={hasPasswordError ? errorDescription : undefined} />
              <FieldDescription>En az 8 karakter olmalı.</FieldDescription>
            </Field>
            <Field orientation="horizontal" className="items-center bg-transparent p-0">
              <Checkbox id="terms_accepted" name="terms_accepted" required aria-invalid={hasTermsError} aria-describedby={hasTermsError ? errorDescription : undefined} aria-label="Kullanım şartlarını ve gizlilik politikasını kabul ediyorum" />
              <p className="text-sm font-semibold leading-5">
                <SoundLink href="/sayfa/kullanim-sartlari" className="text-primary hover:underline">Kullanım şartlarını</SoundLink>
                {" ve "}
                <SoundLink href="/sayfa/gizlilik-politikasi" className="text-primary hover:underline">gizlilik politikasını</SoundLink>
                {" kabul ediyorum."}
              </p>
            </Field>
            <Field orientation="horizontal" className="items-center bg-transparent p-0">
              <Checkbox name="marketing_emails_accepted" />
              <span className="text-sm leading-5 text-muted-foreground">Yeni oyunlar ve duyurular için e-posta almak istiyorum.</span>
            </Field>
            <Field>
              <Button className="h-10 w-full px-4 text-sm font-semibold">Kayıt Ol</Button>
            </Field>
          </FieldGroup>
        </ValidatedAuthForm>
      ) : null}
      <p className="mt-4 text-sm font-semibold">
        Zaten hesabın var mı? <SoundLink href="/giris" className="text-primary hover:underline">Giriş Yap</SoundLink>
      </p>
    </AuthCard>
  );
}

function getRegisterError(error: string) {
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  if (error === "terms") return "Kayıt olmak için kullanım şartlarını kabul etmelisin.";
  if (error === "username") return "Kullanıcı adı 3-29 karakter olmalı; harf, sayı, tire veya alt çizgi içerebilir.";
  if (error === "closed") return "Yeni üyelikler şu anda kapalı.";
  if (error === "age") return "Kayıt için minimum yaş sınırı karşılanmıyor.";
  if (error === "challenge") return "Çok sayıda istek algılandı. Lütfen bot doğrulamasını tamamla.";
  if (error === "form") return "Form gönderilemedi. Lütfen alanları tekrar doldur.";
  if (error === "email") return "Bu e-posta adresiyle kayıt oluşturulamadı. Hesabın varsa giriş yapmayı dene.";
  return "Kayıt oluşturulamadı. Lütfen bilgileri kontrol et.";
}
