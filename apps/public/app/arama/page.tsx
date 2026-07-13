import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oyun Ara",
  description: "Bol Oyun içinde oyun adı, kategori veya etikete göre arama yap.",
};

export default function SearchPage() {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h1 className="text-2xl font-black">Oyun Ara</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Arama kutusunu kullanarak oyunları hızlıca bulabilirsin. Sonuçlar yazdıkça dinamik olarak yüklenir.
      </p>
    </section>
  );
}
