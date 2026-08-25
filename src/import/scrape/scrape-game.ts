import type { ParsedGame } from "@/import/parsers/types";
import { parseGenericGame } from "@/import/parsers/generic.parser";
import { parseMiniplayGame } from "@/import/parsers/miniplay.parser";
import { safeExternalRequest } from "@/import/security/safe-fetch";

export async function scrapeGame(sourceUrl: string, source = "generic", signal?: AbortSignal): Promise<ParsedGame> {
  const response = await safeExternalRequest(sourceUrl, {
    headers: {
      "user-agent": "BolOyunImporter/0.1 (+https://boloyun.com)",
    },
    signal,
    timeoutMs: 20_000,
    maxResponseBytes: 8 * 1024 * 1024,
  });

  if (!response.ok) {
    throw new Error(`Oyun sayfasi indirilemedi: ${sourceUrl}`);
  }

  const html = new TextDecoder().decode(response.bytes);

  if (source === "miniplay") {
    return parseMiniplayGame(html, sourceUrl);
  }

  return parseGenericGame(html, sourceUrl);
}
