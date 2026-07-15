export function allowPublicDemoData(
  nodeEnv = process.env.NODE_ENV,
  githubActions = process.env.GITHUB_ACTIONS,
) {
  return nodeEnv !== "production" || githubActions === "true";
}

export function publicDataUnavailable(source: string, detail?: string) {
  const suffix = detail ? `: ${detail}` : ".";
  return new Error(
    `${source} üretim verisine erişemedi${suffix} Demo verinin canlı önbelleğe yazılması engellendi.`,
  );
}
