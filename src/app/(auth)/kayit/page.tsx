import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getPublicSettings } from "@/lib/db-settings";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ error?: string; challenge?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const { error, challenge } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) redirect("/profil");

  const { general, community } = await getPublicSettings();
  const registrationsEnabled = general.registrationsEnabled && community.registrationsEnabled;

  return (
    <main className="mx-auto w-full max-w-md px-3 py-10">
      <section className="rounded-md border border-border bg-card p-5">
        <h1 className="text-2xl font-black">Kayıt Ol</h1>
        <p className="mt-2 text-sm text-muted-foreground">Oyunlarını favorilere eklemek ve yorum yazmak için ücretsiz hesap oluştur.</p>
        {!registrationsEnabled ? <p className="mt-3 rounded-md bg-warning/10 p-3 text-sm font-semibold text-warning">Yeni üyelikler şu anda kapalı. Mevcut hesabınla giriş yapabilirsin.</p> : null}
        {error ? <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{getRegisterError(error)}</p> : null}
        {registrationsEnabled ? <form action="/auth/signup" method="post" className="mt-4 space-y-3">
          <BotProtectionFields challenge={challenge === "1"} action="signup" />
          <label className="block text-sm font-bold">
            Kullanıcı adı
            <Input name="username" autoComplete="username" required minLength={community.usernameMinLength} maxLength={community.usernameMaxLength} className="mt-1 h-10" />
          </label>
          {community.minimumAge > 0 ? <label className="block text-sm font-bold">Doğum yılı<Input name="birth_year" type="number" autoComplete="bday-year" required min={1900} max={new Date().getFullYear() - community.minimumAge} className="mt-1 h-10" /></label> : null}
          <label className="block text-sm font-bold">
            E-posta
            <Input name="email" type="email" autoComplete="email" required className="mt-1 h-10" />
          </label>
          <label className="block text-sm font-bold">
            Şifre
            <Input name="password" type="password" autoComplete="new-password" required minLength={8} className="mt-1 h-10" />
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold">
            <Checkbox name="terms_accepted" required className="mt-1" />
            <span>Kullanım şartlarını ve gizlilik politikasını kabul ediyorum.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox name="marketing_emails_accepted" className="mt-1" />
            <span>Yeni oyunlar ve duyurular için e-posta almak istiyorum.</span>
          </label>
          <Button className="h-10 w-full px-4 text-sm font-black">Kayıt Ol</Button>
        </form> : null}
        <p className="mt-4 text-sm font-semibold">
          Zaten hesabın var mı? <Link href="/giris" className="text-primary hover:underline">Giriş Yap</Link>
        </p>
      </section>
    </main>
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
