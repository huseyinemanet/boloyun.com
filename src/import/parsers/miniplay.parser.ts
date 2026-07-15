import type { ParsedGame } from "./types";
import { parseGenericGame } from "./generic.parser";
import { stripHtml } from "@/lib/sanitize/html";
import { firstElementHtmlByClass, firstElementTextByClass, firstElementTextWithClassFragment, firstMetaContent, htmlText, readElements, readTags } from "./html-reader";

export function parseMiniplayGame(html: string, sourceUrl: string): ParsedGame {
  const generic = parseGenericGame(html, sourceUrl);
  const iframes = readTags(html, "iframe");
  const iframeSrc =
    iframes.find((tag) => tag.attributes.id === "game-player")?.attributes["data-src"] ??
    firstElementTextByClass(html, "js-ctc-iframe-url").match(/src=['"]([^'"]+)['"]/)?.[1] ??
    generic.detectedEmbedUrl;
  const swfUrl = html.match(/https?:\/\/[^"']+\.swf/i)?.[0] ?? generic.detectedSwfUrl;
  const gameSourceTag = readTags(html, "div").concat(readTags(html, "a")).find((tag) => tag.attributes["data-game-url"] || tag.attributes["data-html5-url"]);
  const html5Url = gameSourceTag?.attributes["data-game-url"] ?? gameSourceTag?.attributes["data-html5-url"];
  const categories = readElements(html, "a")
    .filter((element) => element.attributes.itemprop === "item" || element.attributes.class?.split(/\s+/).includes("tag"))
    .map((element) => element.text)
    .filter(Boolean)
    .slice(0, 8);
  const howToPlay = ["rich-html-desc", "game-about", "description"].map((name) => firstElementTextByClass(html, name)).find(Boolean) ?? "";
  const controls = readControls(html);

  return {
    ...generic,
    originalTitle: getBestTitle(html, sourceUrl, generic.originalTitle),
    originalDescription: stripHtml(firstMetaContent(html, "itemprop", "description") ?? firstMetaContent(html, "property", "og:description") ?? generic.originalDescription),
    originalHowToPlay: stripHtml(howToPlay),
    originalControls: controls.length ? controls : generic.originalControls,
    originalDeveloper: firstElementTextWithClassFragment(html, ["developer", "author"]),
    originalCategories: categories.length ? categories : generic.originalCategories,
    originalTags: readKeywords(html, generic.originalTags),
    thumbnailUrl: firstMetaContent(html, "property", "og:image") ?? generic.thumbnailUrl,
    detectedGameType: swfUrl ? "swf" : html5Url ? "html5" : iframeSrc ? "iframe" : "external",
    detectedEmbedUrl: iframeSrc,
    detectedSwfUrl: swfUrl,
    detectedHtml5Url: html5Url,
    detectedExternalUrl: sourceUrl,
  };
}

function readControls(html: string) {
  const controlsHtml = firstElementHtmlByClass(html, "game-controls");
  return readElements(controlsHtml, "li")
    .map((element) => {
      const typeClass = readTags(element.innerHtml, "span").find((tag) => tag.attributes.class?.split(/\s+/).includes("type"))?.attributes.class ?? "";
      const action = firstElementTextByClass(element.innerHtml, "action");
      return formatControl(typeClass, action);
    })
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

function getBestTitle(html: string, sourceUrl: string, fallback: string) {
  const titleTag = (readElements(html, "title")[0]?.text ?? "").replace(/ free online game on Miniplay\.com/i, "").trim();
  const slugTitle = titleFromSlug(sourceUrl);
  const candidates = [
    readElements(html, "h1")[0]?.text ?? "",
    firstMetaContent(html, "property", "og:title") ?? "",
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

function readKeywords(html: string, fallback: string[]) {
  const keywords = readElements(html, "script")
    .filter((element) => element.attributes.type?.toLocaleLowerCase("en-US") === "application/ld+json")
    .map((element) => element.innerHtml)
    .flatMap((block) => {
      try {
        const parsed = JSON.parse(htmlText(block)) as { keywords?: string };
        return parsed.keywords ? parsed.keywords.split(",") : [];
      } catch {
        return [];
      }
    })
    .map((item) => item.trim())
    .filter(Boolean);

  return keywords.length ? [...new Set(keywords)] : fallback;
}
