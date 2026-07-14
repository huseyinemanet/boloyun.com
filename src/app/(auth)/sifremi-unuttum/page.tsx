import { SoundLink } from "@/components/audio/sound-link";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";
import { AuthCard, AuthMessage } from "../auth-card";
import { ValidatedAuthForm, ValidatedInput } from "../validated-auth-form";

type Props = {
  searchParams: Promise<{ error?: string; notice?: string; challenge?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, notice, challenge } = await searchParams;
  const recoveryError = error ? getRecoveryError(error) : "";
  const hasEmailError = error === "form" || error === "reset";

  return (
    <AuthCard title="Şifremi Unuttum" description="E-posta adresini yaz, şifre yenileme bağlantısını gönderelim.">
      {notice === "sent" ? <AuthMessage type="success">E-posta adresi kayıtlıysa şifre yenileme bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.</AuthMessage> : null}
      {error ? <AuthMessage id="recovery-form-error" type="error">{recoveryError}</AuthMessage> : null}
      <ValidatedAuthForm action="/auth/recover" className="mt-4">
        <FieldGroup>
          <BotProtectionFields challenge={challenge === "1"} action="recovery" />
          <Field>
            <FieldLabel htmlFor="recovery-email">E-posta</FieldLabel>
            <ValidatedInput id="recovery-email" name="email" type="email" autoComplete="email" required serverInvalid={hasEmailError} aria-describedby={hasEmailError ? "recovery-form-error" : undefined} />
          </Field>
          <Field>
            <Button className="h-10 w-full px-4 text-sm font-semibold">Şifre Bağlantısı Gönder</Button>
          </Field>
        </FieldGroup>
      </ValidatedAuthForm>
      <SoundLink href="/giris" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Girişe dön</SoundLink>
    </AuthCard>
  );
}

function getRecoveryError(error: string) {
  if (error === "expired") return "Şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.";
  if (error === "challenge") return "Çok sayıda istek algılandı. Lütfen bot doğrulamasını tamamla.";
  if (error === "form") return "Form gönderilemedi. Lütfen e-posta adresini yeniden yaz.";
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  return "Bağlantı gönderilemedi. Lütfen bir süre sonra tekrar dene.";
}
