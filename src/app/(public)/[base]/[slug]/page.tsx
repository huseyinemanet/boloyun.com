import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameDetailPage, { generateMetadata as generateGameMetadata } from "../../oyun/[slug]/page";
import StaticContentPage, { generateMetadata as generateStaticMetadata } from "../../sayfa/[slug]/page";
import { CategoryView, getCategoryMetadata } from "../../kategori/[slug]/category-view";
import { TagView, getTagMetadata } from "../../etiket/[slug]/tag-view";
import { getPublicSettings } from "@/lib/db-settings";

type Props = {
  params: Promise<{ base: string; slug: string }>;
};

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { base, slug } = await params;
  const kind = await resolvePermalinkKind(base);
  if (kind === "game") return generateGameMetadata({ params: Promise.resolve({ slug }) });
  if (kind === "category") return getCategoryMetadata(slug, 1);
  if (kind === "tag") return getTagMetadata(slug, 1);
  if (kind === "page") return generateStaticMetadata({ params: Promise.resolve({ slug }) });
  return {};
}

export default async function CustomPermalinkPage({ params }: Props) {
  const { base, slug } = await params;
  const kind = await resolvePermalinkKind(base);

  if (kind === "game") return <GameDetailPage params={Promise.resolve({ slug })} />;
  if (kind === "category") return <CategoryView slug={slug} page={1} />;
  if (kind === "tag") return <TagView slug={slug} page={1} />;
  if (kind === "page") return <StaticContentPage params={Promise.resolve({ slug })} />;

  notFound();
}

async function resolvePermalinkKind(base: string) {
  const { permalinks } = await getPublicSettings();
  if (base === permalinks.gameBase) return "game";
  if (base === permalinks.categoryBase) return "category";
  if (base === permalinks.tagBase) return "tag";
  if (base === permalinks.pageBase) return "page";
  return null;
}
