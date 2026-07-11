import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView, getCategoryMetadata } from "../../category-view";

type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  return getCategoryMetadata(slug, parsePage(page));
}

export default async function PaginatedCategoryPage({ params }: Props) {
  const { slug, page } = await params;
  return <CategoryView slug={slug} page={parsePage(page)} />;
}

function parsePage(value: string) {
  const page = Number(value);
  if (!Number.isInteger(page) || page <= 1) notFound();
  return page;
}
