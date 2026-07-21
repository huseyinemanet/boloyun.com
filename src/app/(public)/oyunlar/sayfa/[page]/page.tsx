import { GamesArchiveView, getGamesArchiveMetadata } from "../../games-archive-view";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return getGamesArchiveMetadata(Number(page));
}

export default async function GamesArchivePaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return <GamesArchiveView page={Number(page)} />;
}
