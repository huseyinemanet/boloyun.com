import { notFound } from "next/navigation";
import { getAllStaticPageSlugs, getStaticPage } from "@public/lib/data";
import { metadata } from "@public/lib/seo";

export const dynamicParams = false;
export const dynamic = "force-static";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return (await getAllStaticPageSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await getStaticPage(slug);
  if (!page) return {};
  return metadata({
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.description,
    path: `/sayfa/${page.slug}`,
    image: page.ogImageUrl ?? undefined,
    indexable: page.isIndexable,
  });
}

export default async function StaticContentPage({ params }: Props) {
  const { slug } = await params;
  const page = await getStaticPage(slug);
  if (!page) notFound();

  return (
    <article className="space-y-4 rounded-md border border-border bg-card p-4">
      <h1 className="text-2xl font-black">{page.title}</h1>
      <p className="text-xs font-semibold text-muted-foreground">Güncelleme: {page.updatedAt}</p>
      {page.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 className="text-lg font-black">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-muted-foreground">{paragraph}</p>)}
        </section>
      ))}
    </article>
  );
}
