import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView, getCategoryMetadata } from "../../../../kategori/[slug]/category-view";
import { TagView, getTagMetadata } from "../../../../etiket/[slug]/tag-view";
import { getPublicSettings } from "@/lib/db-settings";

type Props = {
  params: Promise<{ base: string; slug: string; paginationBase: string; page: string }>;
};

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { base, slug, paginationBase, page } = await params;
  const kind = await resolvePaginatedKind(base, paginationBase);
  const pageNumber = parsePage(page);
  if (kind === "category") return getCategoryMetadata(slug, pageNumber);
  if (kind === "tag") return getTagMetadata(slug, pageNumber);
  return {};
}

export default async function CustomPaginatedPermalinkPage({ params }: Props) {
  const { base, slug, paginationBase, page } = await params;
  const kind = await resolvePaginatedKind(base, paginationBase);
  const pageNumber = parsePage(page);

  if (kind === "category") return <CategoryView slug={slug} page={pageNumber} />;
  if (kind === "tag") return <TagView slug={slug} page={pageNumber} />;

  notFound();
}

function parsePage(value: string) {
  const page = Number(value);
  if (!Number.isInteger(page) || page <= 1) notFound();
  return page;
}

async function resolvePaginatedKind(base: string, paginationBase: string) {
  const { permalinks } = await getPublicSettings();
  if (paginationBase !== permalinks.paginationBase) return null;
  if (base === permalinks.categoryBase) return "category";
  if (base === permalinks.tagBase) return "tag";
  return null;
}
