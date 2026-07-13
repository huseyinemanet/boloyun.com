import { notFound } from "next/navigation";
import { GameGrid } from "@public/components/game-grid";
import { getTagPage, getTagPageParams } from "@public/lib/data";
import { metadata } from "@public/lib/seo";

export const dynamicParams = false;
export const dynamic = "force-static";

const perPage = 40;

type Props = {
  params: Promise<{ slug: string; pageNumber: string }>;
};

export async function generateStaticParams() {
  const params = await getTagPageParams(perPage);
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { slug, pageNumber } = await params;
  const currentPage = Number(pageNumber);
  const result = await getTagPage(slug, currentPage, perPage);
  if (!result || currentPage < 2) return {};
  return metadata({
    title: `${result.tag.name} - Sayfa ${currentPage}`,
    description: `${result.tag.name} oyunları sayfa ${currentPage}.`,
    path: `/etiket/${result.tag.slug}/sayfa/${currentPage}`,
    indexable: false,
  });
}

export default async function TagPagedPage({ params }: Props) {
  const { slug, pageNumber } = await params;
  const currentPage = Number(pageNumber);
  if (!Number.isInteger(currentPage) || currentPage < 2) notFound();
  const result = await getTagPage(slug, currentPage, perPage);
  if (!result) notFound();

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-black">{result.tag.name} - Sayfa {currentPage}</h1>
      </section>
      <GameGrid title={`${result.tag.name} Oyunları`} games={result.items} />
    </div>
  );
}
