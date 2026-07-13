import { notFound } from "next/navigation";
import { GameGrid } from "@public/components/game-grid";
import { getAllCategorySlugs, getCategoryPage } from "@public/lib/data";
import { metadata } from "@public/lib/seo";

export const dynamicParams = false;
export const dynamic = "force-static";

const perPage = 40;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return (await getAllCategorySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await getCategoryPage(slug, 1, perPage);
  if (!page) return {};
  return metadata({
    title: page.category.seoTitle || `${page.category.name} Oyna`,
    description: page.category.seoDescription || page.category.description || `${page.category.name} kategorisindeki oyunları ücretsiz oyna.`,
    path: `/kategori/${page.category.slug}`,
    image: page.category.ogImageUrl ?? undefined,
    indexable: page.category.isIndexable ?? true,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const page = await getCategoryPage(slug, 1, perPage);
  if (!page) notFound();

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-black">{page.category.name}</h1>
        {page.category.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.category.description}</p> : null}
      </section>
      <GameGrid title={`${page.category.name} Oyunları`} games={page.items} />
      {page.total > perPage ? <Pagination basePath={`/kategori/${page.category.slug}`} page={1} total={page.total} /> : null}
    </div>
  );
}

function Pagination({ basePath, page, total }: { basePath: string; page: number; total: number }) {
  const pageCount = Math.ceil(total / perPage);
  return (
    <nav className="flex gap-2">
      {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 12).map((item) => (
        <a key={item} href={item === 1 ? basePath : `${basePath}/sayfa/${item}`} className={`rounded-md border px-3 py-2 text-sm font-black ${item === page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
          {item}
        </a>
      ))}
    </nav>
  );
}
