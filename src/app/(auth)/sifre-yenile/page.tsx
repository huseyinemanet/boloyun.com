import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
  const recoveryPending = (await cookies()).get("password_recovery_pending")?.value === "1";

  return (
    <main className="mx-auto w-full max-w-md px-3 py-10">
      <section className="rounded-md border border-border bg-card p-5">
        <h1 className="text-2xl font-black">Yeni Şifre Belirle</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hesabın için en az 8 karakterli yeni bir şifre seç.</p>
        {error ? <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{getPasswordError(error)}</p> : null}
        {data.user && recoveryPending ? (
          <form action="/auth/update-password" method="post" className="mt-4 space-y-3">
            <input type="email" name="username" autoComplete="username" value={data.user.email ?? ""} readOnly className="sr-only" tabIndex={-1} aria-hidden="true" />
            <label className="block text-sm font-bold">Yeni şifre<Input name="password" type="password" autoComplete="new-password" required minLength={8} className="mt-1 h-10" /></label>
            <label className="block text-sm font-bold">Yeni şifre tekrar<Input name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} className="mt-1 h-10" /></label>
            <Button className="h-10 w-full px-4 text-sm font-black">Şifreyi Güncelle</Button>
          </form>
        ) : (
          <div className="mt-4">
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">Şifre yenileme bağlantısı geçersiz veya süresi dolmuş.</p>
            <Link href="/sifremi-unuttum" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Yeni bağlantı iste</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function getPasswordError(error: string) {
  if (error === "weak") return "Şifre en az 8 karakter olmalı.";
  if (error === "mismatch") return "Yazdığın şifreler birbiriyle eşleşmiyor.";
  if (error === "form") return "Form gönderilemedi. Lütfen tekrar dene.";
  if (error === "config") return "Üyelik sistemi henüz yapılandırılmamış.";
  return "Şifre güncellenemedi. Farklı ve güçlü bir şifre dene.";
}
