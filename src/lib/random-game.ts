export function getRandomGameHref(pathname: string): string {
  const gamePathMatch = pathname.match(/^\/oyun\/([^/]+)\/?$/);
  if (!gamePathMatch) return "/rastgele";

  return `/rastgele?exclude=${encodeURIComponent(gamePathMatch[1])}`;
}
