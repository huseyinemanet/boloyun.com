import { stripHtml } from "@/lib/sanitize/html";

type AttributeMap = Record<string, string>;

export function readTags(html: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return [...html.matchAll(pattern)].map((match) => ({
    source: match[0],
    attributes: readAttributes(match[0]),
  }));
}

export function readElements(html: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}\\s*>`, "gi");
  return [...html.matchAll(pattern)].map((match) => ({
    attributes: readAttributes(match[1]),
    innerHtml: match[2],
    text: htmlText(match[2]),
  }));
}

export function firstMetaContent(html: string, attribute: "name" | "property" | "itemprop", value: string) {
  const normalized = value.toLocaleLowerCase("en-US");
  return readTags(html, "meta").find((tag) => tag.attributes[attribute]?.toLocaleLowerCase("en-US") === normalized)?.attributes.content;
}

export function firstElementTextByClass(html: string, className: string) {
  return htmlText(firstElementHtmlByClass(html, className));
}

export function firstElementHtmlByClass(html: string, className: string) {
  for (const match of elementsWithClass(html)) {
    const classes = readAttributes(match[2]).class?.split(/\s+/) ?? [];
    if (classes.includes(className)) return match[3];
  }
  return "";
}

export function firstElementTextWithClassFragment(html: string, fragments: string[]) {
  for (const match of elementsWithClass(html)) {
    const className = readAttributes(match[2]).class ?? "";
    if (fragments.some((fragment) => className.includes(fragment))) return htmlText(match[3]);
  }
  return "";
}

function elementsWithClass(html: string) {
  return html.matchAll(/<([a-z][a-z0-9:-]*)\b([^>]*\bclass\s*=\s*(?:"[^"]*"|'[^']*')[^>]*)>([\s\S]*?)<\/\1\s*>/gi);
}

export function htmlText(value: string) {
  return decodeHtmlEntities(stripHtml(value));
}

export function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, token: string) => {
    if (token.startsWith("#x") || token.startsWith("#X")) return codePoint(Number.parseInt(token.slice(2), 16), entity);
    if (token.startsWith("#")) return codePoint(Number.parseInt(token.slice(1), 10), entity);
    return named[token.toLocaleLowerCase("en-US")] ?? entity;
  });
}

function readAttributes(source: string): AttributeMap {
  const attributes: AttributeMap = {};
  const pattern = /([:@a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of source.matchAll(pattern)) {
    attributes[match[1].toLocaleLowerCase("en-US")] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function codePoint(value: number, fallback: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
}
