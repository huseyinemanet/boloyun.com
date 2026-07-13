import { notFound } from "next/navigation";
import { GameGrid } from "@public/components/game-grid";
import { getAllTagSlugs, getTagPage } from "@public/lib/data";
import { metadata } from "@public/lib/seo";

export const dynamicParams = false;
export const dynamic = "force-static";

const perPage = 40;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return (await getAllTagSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await getTagPage(slug, 1, perPage);
  if (!page) return {};
  return metadata({
    title: page.tag.seoTitle || `${page.tag.name} Oyunları`,
    description: page.tag.seoDescription || page.tag.description || `${page.tag.name} etiketiyle oyunları ücretsiz oyna.`,
    path: `/etiket/${page.tag.slug}`,
    image: page.tag.ogImageUrl ?? undefined,
    indexable: page.tag.isIndexable ?? false,
  });
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const page = await getTagPage(slug, 1, perPage);
  if (!page) notFound();

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-black">{page.tag.name}</h1>
        {page.tag.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.tag.description}</p> : null}
      </section>
      <GameGrid title={`${page.tag.name} Oyunları`} games={page.items} />
    </div>
  );
}
