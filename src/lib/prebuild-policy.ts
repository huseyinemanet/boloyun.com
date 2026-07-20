// Keep deploy-time rendering focused on high-traffic discovery paths. Other
// public routes are generated on demand and retained by the existing ISR cache.
export const PUBLIC_PREBUILD_LIMITS = {
  categories: 24,
  games: 48,
  latestGames: 24,
  popularGames: 36,
} as const;

type SlugRow = { slug?: unknown };

export function mergePrebuildSlugs(
  groups: ReadonlyArray<ReadonlyArray<SlugRow>>,
  limit: number,
): Array<{ slug: string }> {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];
  const slugs = new Set<string>();

  for (const group of groups) {
    for (const row of group) {
      if (typeof row.slug !== "string" || !row.slug) continue;
      slugs.add(row.slug);
      if (slugs.size >= safeLimit) return Array.from(slugs, (slug) => ({ slug }));
    }
  }

  return Array.from(slugs, (slug) => ({ slug }));
}
