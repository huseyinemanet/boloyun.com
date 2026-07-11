import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction, signInWithGoogleAction } from "./actions";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";

type Props = {
  searchParams: Promise<{ error?: string; notice?: string; next?: string; challenge?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, notice, next = "/", challenge } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-3 py-10">
      <section className="rounded-md border border-border bg-card p-5">
        <h1 className="text-2xl font-black">Giriş Yap</h1>
        <p className="mt-2 text-sm text-muted-foreground">Favorilerini, yorumlarını ve son oynadığın oyunları hesabında sakla.</p>
        {notice === "created" ? <Message type="success">Hesabın oluşturuldu. Şimdi giriş yapabilirsin.</Message> : null}
        {notice === "verify-email" ? <Message type="success">Hesabın oluşturuldu. E-postandaki doğrulama bağlantısını açtıktan sonra giriş yapabilirsin.</Message> : null}
        {notice === "password-updated" ? <Message type="success">Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</Message> : null}
        {error ? <Message type="error">{getLoginError(error)}</Message> : null}

        <form action={signInWithGoogleAction} className="mt-4">
          <input type="hidden" name="next" value={next} />
          <Button variant="outline" className="h-10 w-full px-4 text-sm font-black">
            Google ile Giriş Yap
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs font-bold text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          veya
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={signInAction} className="space-y-3">
          <BotProtectionFields challenge={challenge === "1"} action="login" />
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-bold">
            E-posta
            <Input name="email" type="email" required className="mt-1 h-10" />
          </label>
          <label className="block text-sm font-bold">
            Şifre
            <Input name="password" type="password" required className="mt-1 h-10" />
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

function Message({ type, children }: { type: "success" | "error"; children: React.ReactNode }) {
  return <p role={type === "error" ? "alert" : "status"} className={`mt-3 rounded-md p-3 text-sm font-semibold ${type === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{children}</p>;
}

function getLoginError(error: string) {
  if (error === "blocked") return "Hesabın engellenmiş. Yardım için site yönetimiyle iletişime geç.";
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  if (error === "google") return "Google ile giriş henüz Supabase tarafında etkin değil.";
  if (error === "challenge") return "Çok sayıda giriş denemesi algılandı. Lütfen bot doğrulamasını tamamla.";
  return "E-posta veya şifre hatalı.";
}
