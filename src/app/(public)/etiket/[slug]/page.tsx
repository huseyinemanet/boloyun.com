import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getTagMetadata, TagView } from "./tag-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return getTagMetadata(slug, 1);
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const requestedPage = Number((await searchParams).page ?? "1");
  if (Number.isInteger(requestedPage) && requestedPage > 1) permanentRedirect(`/etiket/${slug}/sayfa/${requestedPage}`);
  return <TagView slug={slug} page={1} />;
}
