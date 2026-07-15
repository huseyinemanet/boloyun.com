import type { Metadata } from "next";
import { SoundLink } from "@/components/audio/sound-link";
import { getPublicCategories } from "@/lib/db-categories";
import { getPublicSettings } from "@/lib/db-settings";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return buildMetadata({
    title: "Tüm Oyun Kategorileri",
    description: "BolOyun'daki tüm oyun kategorilerini keşfet ve sevdiğin oyunlara hızlıca ulaş.",
    canonicalPath: "/kategoriler",
    indexable: true,
    siteName: settings.general.siteName,
    baseUrl: settings.seo.canonicalDomain,
    defaultImage: settings.seo.openGraphImageUrl,
  });
}

export default async function CategoriesIndexPage() {
  const categories = await getPublicCategories(500);

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-semibold">Tüm Oyun Kategorileri</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Aradığın oyun türünü seç ve ücretsiz tarayıcı oyunlarını keşfet.
        </p>
      </section>
      <nav aria-label="Tüm oyun kategorileri" className="grid gap-2 rounded-md border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => (
          <SoundLink
            key={category.id}
            href={`/kategori/${category.slug}`}
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm font-semibold transition hover:border-primary hover:bg-accent"
          >
            {category.name}
          </SoundLink>
        ))}
      </nav>
    </div>
  );
}
