const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

export function getIstanbulDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function rotateGamesForDay<T extends { id: string }>(games: T[], dayKey: string, sectionKey: string) {
  return games.toSorted((left, right) => {
    const leftScore = stableHash(`${sectionKey}:${dayKey}:${left.id}`);
    const rightScore = stableHash(`${sectionKey}:${dayKey}:${right.id}`);
    return leftScore - rightScore || left.id.localeCompare(right.id);
  });
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
