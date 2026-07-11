import * as cheerio from "cheerio";
import type { ParsedGame } from "./types";
import { stripHtml } from "@/lib/sanitize/html";

export function parseGenericGame(html: string, sourceUrl: string): ParsedGame {
  const $ = cheerio.load(html);
  const url = new URL(sourceUrl);
  const iframeSrc = $("#game-player").attr("data-src") ?? $("iframe[data-src]").first().attr("data-src") ?? $("iframe").first().attr("src");
  const swfUrl = html.match(/https?:\/\/[^"']+\.swf/i)?.[0];
  const jsonLd = readJsonLd($);
  const title = asText(jsonLd?.name) || $("h1").first().text().trim() || $("title").text().trim();
  const description =
    asText(jsonLd?.description) ||
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  return {
    sourceUrl,
    sourceDomain: url.hostname,
    originalTitle: stripHtml(title),
    originalDescription: stripHtml(description),
    originalControls: [],
    originalCategories: normalizeList(jsonLd?.genre),
    originalTags: normalizeList(jsonLd?.keywords),
    thumbnailUrl: getImage(jsonLd?.image) ?? $('meta[property="og:image"]').attr("content"),
    detectedGameType: swfUrl ? "swf" : iframeSrc ? "iframe" : "external",
    detectedEmbedUrl: iframeSrc,
    detectedSwfUrl: swfUrl,
    detectedExternalUrl: sourceUrl,
    rawHtmlSnapshot: html.slice(0, 250_000),
  };
}

function readJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const blocks = $('script[type="application/ld+json"]')
    .map((_, element) => $(element).text())
    .get();

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block) as Record<string, unknown>;
      if (parsed["@type"] === "WebApplication" || parsed["@type"] === "VideoGame") {
        return parsed;
      }
    } catch {
      // Ignore invalid JSON-LD blocks and continue with HTML fallbacks.
    }
  }

  return null;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function getImage(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "url" in value && typeof value.url === "string") {
    return value.url;
  }
  return undefined;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}
