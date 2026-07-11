import type { ParsedGame } from "@/import/parsers/types";
import { parseGenericGame } from "@/import/parsers/generic.parser";
import { parseMiniplayGame } from "@/import/parsers/miniplay.parser";
import { readExternalText, safeExternalFetch } from "@/import/security/safe-fetch";

export async function scrapeGame(sourceUrl: string, source = "generic", signal?: AbortSignal): Promise<ParsedGame> {
  const response = await safeExternalFetch(sourceUrl, {
    headers: {
      "user-agent": "BolOyunImporter/0.1 (+https://boloyun.com)",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Oyun sayfasi indirilemedi: ${sourceUrl}`);
  }

  const html = await readExternalText(response, 8 * 1024 * 1024);

  if (source === "miniplay") {
    return parseMiniplayGame(html, sourceUrl);
  }

  return parseGenericGame(html, sourceUrl);
}
