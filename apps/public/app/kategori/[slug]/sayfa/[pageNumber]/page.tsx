import { notFound } from "next/navigation";
import { GameGrid } from "@public/components/game-grid";
import { getCategoryPage, getCategoryPageParams } from "@public/lib/data";
import { metadata } from "@public/lib/seo";

export const dynamicParams = false;
export const dynamic = "force-static";

const perPage = 40;

type Props = {
  params: Promise<{ slug: string; pageNumber: string }>;
};

export async function generateStaticParams() {
  const params = await getCategoryPageParams(perPage);
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { slug, pageNumber } = await params;
  const currentPage = Number(pageNumber);
  const result = await getCategoryPage(slug, currentPage, perPage);
  if (!result || currentPage < 2) return {};
  return metadata({
    title: `${result.category.name} - Sayfa ${currentPage}`,
    description: `${result.category.name} oyunları sayfa ${currentPage}.`,
    path: `/kategori/${result.category.slug}/sayfa/${currentPage}`,
    indexable: false,
  });
}

export default async function CategoryPagedPage({ params }: Props) {
  const { slug, pageNumber } = await params;
  const currentPage = Number(pageNumber);
  if (!Number.isInteger(currentPage) || currentPage < 2) notFound();
  const result = await getCategoryPage(slug, currentPage, perPage);
  if (!result) notFound();

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-black">{result.category.name} - Sayfa {currentPage}</h1>
      </section>
      <GameGrid title={`${result.category.name} Oyunları`} games={result.items} />
    </div>
  );
}
