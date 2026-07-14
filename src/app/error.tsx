"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><section role="alert"><h1 className="text-2xl font-semibold">Bir şeyler ters gitti</h1><p className="mt-3 text-muted-foreground">İçerik şu anda yüklenemedi. Lütfen tekrar deneyin.</p><button type="button" onClick={reset} className="mt-6 min-h-11 rounded-md bg-primary px-5 font-bold text-primary-foreground">Tekrar dene</button></section></main>;
}
