import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { CategoryView, getCategoryMetadata } from "./category-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return getCategoryMetadata(slug, 1);
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const requestedPage = Number((await searchParams).page ?? "1");
  if (Number.isInteger(requestedPage) && requestedPage > 1) permanentRedirect(`/kategori/${slug}/sayfa/${requestedPage}`);
  return <CategoryView slug={slug} page={1} />;
}
