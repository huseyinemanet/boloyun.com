import * as cheerio from "cheerio";
import type { ParsedGame } from "./types";
import { parseGenericGame } from "./generic.parser";
import { stripHtml } from "@/lib/sanitize/html";

export function parseMiniplayGame(html: string, sourceUrl: string): ParsedGame {
  const $ = cheerio.load(html);
  const generic = parseGenericGame(html, sourceUrl);
  const iframeSrc =
    $("#game-player").attr("data-src") ??
    $("iframe#game-player").attr("data-src") ??
    $(".js-ctc-iframe-url").text().match(/src=['"]([^'"]+)['"]/)?.[1] ??
    generic.detectedEmbedUrl;
  const swfUrl = html.match(/https?:\/\/[^"']+\.swf/i)?.[0] ?? generic.detectedSwfUrl;
  const html5Url =
    $('[data-game-url], [data-html5-url]').first().attr("data-game-url") ??
    $('[data-html5-url]').first().attr("data-html5-url");
  const categories = $(".breadcrumb a[itemprop='item'], .tag[href], a.tag")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 8);
  const howToPlay = firstNonEmptyText($, [".rich-html-desc", ".game-about", ".description"]);
  const controls = readControls($);

  return {
    ...generic,
    originalTitle: getBestTitle($, sourceUrl, generic.originalTitle),
    originalDescription: stripHtml($('meta[itemprop="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? generic.originalDescription),
    originalHowToPlay: stripHtml(howToPlay),
    originalControls: controls.length ? controls : generic.originalControls,
    originalDeveloper: $("[class*='developer'], [class*='author']").first().text().trim(),
    originalCategories: categories.length ? categories : generic.originalCategories,
    originalTags: readKeywords($, generic.originalTags),
    thumbnailUrl: $('meta[property="og:image"]').attr("content") ?? generic.thumbnailUrl,
    detectedGameType: swfUrl ? "swf" : html5Url ? "html5" : iframeSrc ? "iframe" : "external",
    detectedEmbedUrl: iframeSrc,
    detectedSwfUrl: swfUrl,
    detectedHtml5Url: html5Url,
    detectedExternalUrl: sourceUrl,
  };
}

function readControls($: cheerio.CheerioAPI) {
  return $(".game-controls li")
    .map((_, element) => {
      const typeClass = $(element).find(".type").attr("class") ?? "";
      const action = $(element).find(".action").text().trim();
      return formatControl(typeClass, action);
    })
    .get()
    .filter(Boolean);
}

function formatControl(typeClass: string, action: string) {
  const input = controlInputLabel(typeClass);
  const translatedAction = translateControlAction(action);

  if (!input && !translatedAction) return "";
  if (!input) return translatedAction;
  if (!translatedAction) return input;
  return `${input}: ${translatedAction}`;
}

function controlInputLabel(typeClass: string) {
  if (typeClass.includes("kb-wasd")) return "WASD";
  if (typeClass.includes("kb-arrows")) return "Yön tuşları";
  if (typeClass.includes("kb-spacebar")) return "Boşluk";
  if (typeClass.includes("mouse-move")) return "Fare";
  if (typeClass.includes("mouse-left-click")) return "Sol tık";
  if (typeClass.includes("mouse-right-click")) return "Sağ tık";
  if (typeClass.includes("mouse")) return "Fare";
  if (typeClass.includes("kb-")) return "Klavye";
  return "";
}

function translateControlAction(action: string) {
  const normalized = action.trim().toLocaleUpperCase("tr");
  const dictionary: Record<string, string> = {
    MOVE: "Hareket et",
    AIM: "Nişan al",
    SHOOT: "Ateş et",
    JUMP: "Zıpla",
    ATTACK: "Saldır",
    RUN: "Koş",
    PAUSE: "Duraklat",
    "MANTENERSE EN EL SITIO": "Yerinde kal",
  };

  return dictionary[normalized] ?? action.trim();
}

function getBestTitle($: cheerio.CheerioAPI, sourceUrl: string, fallback: string) {
  const titleTag = $("title").text().replace(/ free online game on Miniplay\.com/i, "").trim();
  const slugTitle = titleFromSlug(sourceUrl);
  const candidates = [
    $("h1").first().text().trim(),
    $('meta[property="og:title"]').attr("content") ?? "",
    fallback,
    titleTag,
    slugTitle,
  ].map(stripHtml);

  return candidates.find((candidate) => candidate.length >= 4) ?? slugTitle;
}

function titleFromSlug(sourceUrl: string) {
  const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1) ?? "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readKeywords($: cheerio.CheerioAPI, fallback: string[]) {
  const keywords = $('script[type="application/ld+json"]')
    .map((_, element) => $(element).text())
    .get()
    .flatMap((block) => {
      try {
        const parsed = JSON.parse(block) as { keywords?: string };
        return parsed.keywords ? parsed.keywords.split(",") : [];
      } catch {
        return [];
      }
    })
    .map((item) => item.trim())
    .filter(Boolean);

  return keywords.length ? [...new Set(keywords)] : fallback;
}

function firstNonEmptyText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const text = $(selector)
      .map((_, element) => $(element).text().trim())
      .get()
      .find((value) => value.length > 0);

    if (text) return text;
  }

  return "";
}
