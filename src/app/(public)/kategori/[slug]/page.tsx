import type { Metadata } from "next";
import { CategoryView, getCategoryMetadata } from "./category-view";
import { getPrebuildCategorySlugs } from "@/lib/db-categories";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getPrebuildCategorySlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return getCategoryMetadata(slug, 1);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryView slug={slug} page={1} />;
}
