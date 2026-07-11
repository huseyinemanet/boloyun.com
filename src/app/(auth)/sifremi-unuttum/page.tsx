import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

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
        {notice === "sent" ? <p role="status" className="mt-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Şifre yenileme bağlantısı gönderildi.</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">Bağlantı gönderilemedi. Lütfen tekrar dene.</p> : null}
        <ForgotPasswordForm challenge={challenge === "1"} />
        <Link href="/giris" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Girişe dön</Link>
      </section>
    </main>
  );
}
