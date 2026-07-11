export function getArg(name: string, fallback?: string) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];

  return fallback;
}

export function hasFlag(name: string) {
  return process.argv.includes(name);
}

export function getLimit(fallback: number) {
  const raw = getArg("--limit", String(fallback));
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
