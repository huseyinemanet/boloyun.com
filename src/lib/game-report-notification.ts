import { gameReportReasonLabels, type GameReportReason } from "@/lib/game-report-validation";

type NotifyInput = {
  gameTitle: string;
  gameSlug: string;
  reason: GameReportReason;
  details: string | null;
};

type NotifyOptions = {
  apiKey?: string;
  toEmail?: string;
  fromEmail?: string;
  fromName?: string;
  siteUrl?: string;
  fetchImpl?: typeof fetch;
};

export async function notifyAdminOfGameReport(input: NotifyInput, options: NotifyOptions = {}) {
  const apiKey = options.apiKey ?? process.env.BREVO_API_KEY;
  const toEmail = options.toEmail ?? process.env.GAME_REPORT_NOTIFICATION_EMAIL;
  const fromEmail = options.fromEmail ?? process.env.GAME_REPORT_FROM_EMAIL;
  if (!apiKey || !toEmail || !fromEmail) {
    return { ok: true as const, skipped: true as const, reason: "missing_config" as const };
  }

  const siteUrl = (options.siteUrl ?? process.env.SITE_URL ?? "https://boloyun.com").replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const gameUrl = `${siteUrl}/oyun/${encodeURIComponent(input.gameSlug)}`;
  const adminUrl = `${siteUrl}/admin/games/reports`;
  const details = input.details ? `\nOyuncunun notu: ${input.details}` : "";
  const response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: options.fromName ?? process.env.GAME_REPORT_FROM_NAME ?? "Bol Oyun", email: fromEmail },
      to: [{ email: toEmail }],
      subject: `Oyun bildirimi: ${input.gameTitle}`,
      textContent: [
        `${input.gameTitle} için yeni bir çalışma sorunu bildirildi.`,
        `Sorun: ${gameReportReasonLabels[input.reason]}${details}`,
        `Oyun: ${gameUrl}`,
        `Bildirim kuyruğu: ${adminUrl}`,
      ].join("\n\n"),
    }),
  });

  if (!response.ok) {
    return { ok: false as const, skipped: false as const, reason: `brevo_${response.status}` };
  }
  return { ok: true as const, skipped: false as const };
}
