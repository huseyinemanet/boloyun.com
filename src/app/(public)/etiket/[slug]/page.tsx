import type { Metadata } from "next";
import { getTagMetadata, TagView } from "./tag-view";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return getTagMetadata(slug, 1);
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  return <TagView slug={slug} page={1} />;
}
