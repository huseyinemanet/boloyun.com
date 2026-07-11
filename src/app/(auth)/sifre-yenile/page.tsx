import { UpdatePasswordForm } from "./update-password-form";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-3 py-10">
      <section className="rounded-md border border-border bg-card p-5">
        <h1 className="text-2xl font-black">Yeni Şifre Belirle</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hesabın için en az 8 karakterli yeni bir şifre seç.</p>
        {error ? <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">Şifre güncellenemedi. Bağlantının süresi dolmuşsa yeni bir sıfırlama e-postası isteyin.</p> : null}
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
