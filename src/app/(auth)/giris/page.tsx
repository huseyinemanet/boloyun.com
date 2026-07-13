import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";
import { getCurrentProfile } from "@/lib/auth";
import { safeLocalPath } from "@/lib/security/navigation";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ error?: string; notice?: string; next?: string; challenge?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, notice, next = "/", challenge } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) {
    const target = safeLocalPath(next, "/profil");
    redirect(target === "/giris" || target === "/kayit" ? "/profil" : target);
  }
  const loginError = error ? getLoginError(error) : "";
  const hasFieldError = error === "invalid" || error === "form";

  return (
    <main className="mx-auto w-full max-w-md px-3 py-10">
      <section className="rounded-md border border-border bg-card p-5">
        <h1 className="text-2xl font-black">Giriş Yap</h1>
        <p className="mt-2 text-sm text-muted-foreground">Favorilerini, yorumlarını ve son oynadığın oyunları hesabında sakla.</p>
        {notice === "created" ? <Message type="success">Hesabın oluşturuldu. Şimdi giriş yapabilirsin.</Message> : null}
        {notice === "verify-email" ? <Message type="success">Hesabın oluşturuldu. E-postandaki doğrulama bağlantısını açtıktan sonra giriş yapabilirsin.</Message> : null}
        {notice === "password-updated" ? <Message type="success">Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</Message> : null}
        {error ? <Message id="login-form-error" type="error">{loginError}</Message> : null}

        <Button asChild variant="outline" className="mt-4 h-10 w-full px-4 text-sm font-black">
          <Link href={`/auth/google?next=${encodeURIComponent(next)}`}>
            Google ile Giriş Yap
          </Link>
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs font-bold text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          veya
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action="/auth/signin" method="post" className="space-y-3">
          <BotProtectionFields challenge={challenge === "1"} action="login" />
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-bold">
            E-posta
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={hasFieldError}
              aria-describedby={hasFieldError ? "login-form-error" : undefined}
              className="mt-1 h-10"
            />
          </label>
          <label className="block text-sm font-bold">
            Şifre
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={hasFieldError}
              aria-describedby={hasFieldError ? "login-form-error" : undefined}
              className="mt-1 h-10"
            />
          </label>
          <Button className="h-10 w-full px-4 text-sm font-black">Giriş Yap</Button>
        </form>

        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm font-semibold">
          <Link href="/kayit" className="text-primary hover:underline">Kayıt Ol</Link>
          <Link href="/sifremi-unuttum" className="text-primary hover:underline">Şifremi Unuttum</Link>
        </div>
      </section>
    </main>
  );
}

function Message({ id, type, children }: { id?: string; type: "success" | "error"; children: React.ReactNode }) {
  return <p id={id} role={type === "error" ? "alert" : "status"} className={`mt-3 rounded-md p-3 text-sm font-semibold ${type === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{children}</p>;
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
