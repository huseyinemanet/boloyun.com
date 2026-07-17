import type { GameImportStatus } from "@/import/db/game-imports";

export function importStatusLabel(status: GameImportStatus) {
  const labels: Record<GameImportStatus, string> = {
    discovered: "Keşfedildi",
    scraped: "İçerik çekildi",
    ai_generated: "AI hazır",
    pending_review: "İncelenecek",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    failed: "Başarısız",
    duplicate: "Kopya",
    needs_fix: "Düzeltilecek",
  };
  return labels[status];
}
