import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";

type Props = {
  searchParams: Promise<{ error?: string; notice?: string; challenge?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, notice, challenge } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-3 py-10">
      <section className="rounded-md border border-border bg-card p-5">
        <h1 className="text-2xl font-black">Şifremi Unuttum</h1>
        <p className="mt-2 text-sm text-muted-foreground">E-posta adresini yaz, şifre yenileme bağlantısını gönderelim.</p>
        {notice === "sent" ? <p role="status" className="mt-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">E-posta adresi kayıtlıysa şifre yenileme bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{getRecoveryError(error)}</p> : null}
        <form action="/auth/recover" method="post" className="mt-4 space-y-3">
          <BotProtectionFields challenge={challenge === "1"} action="recovery" />
          <label className="block text-sm font-bold">
            E-posta
            <Input name="email" type="email" autoComplete="email" required className="mt-1 h-10" />
          </label>
          <Button className="h-10 w-full px-4 text-sm font-black">Şifre Bağlantısı Gönder</Button>
        </form>
        <Link href="/giris" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Girişe dön</Link>
      </section>
    </main>
  );
}

function getRecoveryError(error: string) {
  if (error === "expired") return "Şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.";
  if (error === "challenge") return "Çok sayıda istek algılandı. Lütfen bot doğrulamasını tamamla.";
  if (error === "form") return "Form gönderilemedi. Lütfen e-posta adresini yeniden yaz.";
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  return "Bağlantı gönderilemedi. Lütfen bir süre sonra tekrar dene.";
}
