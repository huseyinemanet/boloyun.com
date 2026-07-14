import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 text-center">
      <section>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Bu sayfa bulunamadı</h1>
        <p className="mt-3 text-muted-foreground">Aradığınız oyun veya sayfa kaldırılmış ya da adresi değişmiş olabilir.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground">Oyunlara dön</Link>
      </section>
    </main>
  );
}
