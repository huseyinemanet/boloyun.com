import { cookies } from "next/headers";
import { SoundLink } from "@/components/audio/sound-link";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasValidPasswordRecoveryCookie, PASSWORD_RECOVERY_COOKIE } from "@/lib/auth-recovery";
import { AuthCard, AuthMessage } from "../auth-card";
import { ValidatedAuthForm, ValidatedInput } from "../validated-auth-form";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
  const user = data.user;
  const recoveryCookie = (await cookies()).get(PASSWORD_RECOVERY_COOKIE)?.value;
  const canUpdatePassword = Boolean(user?.id && hasValidPasswordRecoveryCookie(recoveryCookie, user.id));

  return (
    <AuthCard title="Yeni Şifre Belirle" description="Hesabın için en az 8 karakterli yeni bir şifre seç.">
      {error ? <AuthMessage id="password-form-error" type="error">{getPasswordError(error)}</AuthMessage> : null}
      {canUpdatePassword && user ? (
          <ValidatedAuthForm action="/auth/update-password" className="mt-4">
            <input type="email" name="username" autoComplete="username" value={user.email ?? ""} readOnly className="sr-only" tabIndex={-1} aria-hidden="true" />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">Yeni şifre</FieldLabel>
                <ValidatedInput id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} serverInvalid={error === "weak" || error === "mismatch" || error === "form"} aria-describedby={error ? "password-form-error" : undefined} />
                <FieldDescription>En az 8 karakter olmalı.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password-confirmation">Yeni şifre tekrar</FieldLabel>
                <ValidatedInput id="new-password-confirmation" name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} serverInvalid={error === "mismatch" || error === "form"} aria-describedby={error ? "password-form-error" : undefined} />
              </Field>
              <Field>
                <Button className="h-10 w-full px-4 text-sm font-semibold">Şifreyi Güncelle</Button>
              </Field>
            </FieldGroup>
          </ValidatedAuthForm>
        ) : (
          <div className="mt-4">
            <AuthMessage type="error">Şifre yenileme bağlantısı geçersiz veya süresi dolmuş.</AuthMessage>
            <SoundLink href="/sifremi-unuttum" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Yeni bağlantı iste</SoundLink>
          </div>
        )}
    </AuthCard>
  );
}

function getPasswordError(error: string) {
  if (error === "weak") return "Şifre en az 8 karakter olmalı.";
  if (error === "mismatch") return "Yazdığın şifreler birbiriyle eşleşmiyor.";
  if (error === "form") return "Form gönderilemedi. Lütfen tekrar dene.";
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  return "Şifre güncellenemedi. Farklı ve güçlü bir şifre dene.";
}
