export const gameReportReasons = ["broken", "not_loading", "not_playable", "wrong_content", "other"] as const;

export type GameReportReason = (typeof gameReportReasons)[number];

export const gameReportReasonLabels: Record<GameReportReason, string> = {
  broken: "Oyun hiç çalışmıyor",
  not_loading: "Oyun yüklenmiyor",
  not_playable: "Oyun açılıyor ama oynanamıyor",
  wrong_content: "Yanlış oyun veya içerik açılıyor",
  other: "Başka bir sorun var",
};

export type ValidGameReportInput = {
  gameId: string;
  reason: GameReportReason;
  details: string | null;
};

export function validateGameReportInput(value: unknown): ValidGameReportInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const gameId = typeof input.gameId === "string" ? input.gameId.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";

  if (!isUuid(gameId) || !isGameReportReason(reason) || details.length > 500) return null;
  return { gameId, reason, details: details || null };
}

export function isGameReportReason(value: string): value is GameReportReason {
  return gameReportReasons.includes(value as GameReportReason);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
