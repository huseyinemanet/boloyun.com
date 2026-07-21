import { GamesArchiveView, getGamesArchiveMetadata } from "./games-archive-view";

export const revalidate = 3600;

export function generateMetadata() {
  return getGamesArchiveMetadata(1);
}

export default function GamesArchivePage() {
  return <GamesArchiveView page={1} />;
}
