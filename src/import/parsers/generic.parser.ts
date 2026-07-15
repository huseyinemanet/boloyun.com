import type { ParsedGame } from "./types";
import { stripHtml } from "@/lib/sanitize/html";
import { firstMetaContent, htmlText, readElements, readTags } from "./html-reader";

export function parseGenericGame(html: string, sourceUrl: string): ParsedGame {
  const url = new URL(sourceUrl);
  const iframes = readTags(html, "iframe");
  const iframeSrc =
    iframes.find((tag) => tag.attributes.id === "game-player")?.attributes["data-src"] ??
    iframes.find((tag) => tag.attributes["data-src"])?.attributes["data-src"] ??
    iframes[0]?.attributes.src;
  const swfUrl = html.match(/https?:\/\/[^"']+\.swf/i)?.[0];
  const jsonLd = readJsonLd(html);
  const title = asText(jsonLd?.name) || readElements(html, "h1")[0]?.text || readElements(html, "title")[0]?.text || "";
  const description =
    asText(jsonLd?.description) ||
    firstMetaContent(html, "property", "og:description") ||
    firstMetaContent(html, "name", "description") ||
    "";

  return {
    sourceUrl,
    sourceDomain: url.hostname,
    originalTitle: stripHtml(title),
    originalDescription: stripHtml(description),
    originalControls: [],
    originalCategories: normalizeList(jsonLd?.genre),
    originalTags: normalizeList(jsonLd?.keywords),
    thumbnailUrl: getImage(jsonLd?.image) ?? firstMetaContent(html, "property", "og:image"),
    detectedGameType: swfUrl ? "swf" : iframeSrc ? "iframe" : "external",
    detectedEmbedUrl: iframeSrc,
    detectedSwfUrl: swfUrl,
    detectedExternalUrl: sourceUrl,
    rawHtmlSnapshot: html.slice(0, 250_000),
  };
}

function readJsonLd(html: string): Record<string, unknown> | null {
  const blocks = readElements(html, "script")
    .filter((element) => element.attributes.type?.toLocaleLowerCase("en-US") === "application/ld+json")
    .map((element) => element.innerHtml);

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(htmlText(block)) as Record<string, unknown>;
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
