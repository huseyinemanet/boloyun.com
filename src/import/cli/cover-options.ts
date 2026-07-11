export function getCoverOptions(defaultLimit = 500) {
  const limit = integerArg("--limit", defaultLimit, 1, 100_000);
  const concurrency = integerArg("--concurrency", 8, 1, 32);
  return { limit, concurrency };
}

export function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function integerArg(name: string, fallback: number, min: number, max: number) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} ${min}-${max} arasında bir tam sayı olmalı.`);
  }
  return value;
}
