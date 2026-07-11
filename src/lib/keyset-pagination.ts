export type KeysetCursor = {
  updatedAt: string;
  id: string;
};

export type KeysetDirection = "next" | "previous";

export function encodeKeysetCursor(cursor: KeysetCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeKeysetCursor(value: string | string[] | undefined): KeysetCursor | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<KeysetCursor>;
    if (typeof parsed.id !== "string" || !isUuid(parsed.id) || typeof parsed.updatedAt !== "string") return null;
    if (!Number.isFinite(Date.parse(parsed.updatedAt))) return null;
    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function parseKeysetDirection(value: string | string[] | undefined): KeysetDirection {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "previous" ? "previous" : "next";
}

export function keysetFilter(cursor: KeysetCursor, direction: KeysetDirection) {
  const operator = direction === "previous" ? "gt" : "lt";
  return `updated_at.${operator}.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.${operator}.${cursor.id})`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
