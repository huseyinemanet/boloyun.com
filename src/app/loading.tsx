export default function Loading() {
  return <main id="main-content" aria-busy="true" aria-live="polite" className="mx-auto max-w-6xl px-4 py-12"><span className="sr-only">İçerik yükleniyor</span><div className="h-8 w-52 animate-pulse rounded bg-muted" /><div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />)}</div></main>;
}
