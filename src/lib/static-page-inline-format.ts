const INLINE_TOKEN_PATTERN = /\[\[(\/)?(b|i|u)\]\]/g;
const LINK_OPEN_PATTERN = /\[\[a:([^\]]+)\]\]/g;

export function staticPageInlineMarkupToHtml(value: string) {
  return escapeHtml(value)
    .replace(LINK_OPEN_PATTERN, (_, encodedUrl: string) => {
      const url = decodeLinkUrl(encodedUrl);
      return url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">`
        : "";
    })
    .replace(/\[\[\/a\]\]/g, "</a>")
    .replace(INLINE_TOKEN_PATTERN, (_, closing: string | undefined, tag: "b" | "i" | "u") => {
      const htmlTag = tag === "b" ? "strong" : tag === "i" ? "em" : "u";
      return `<${closing ? "/" : ""}${htmlTag}>`;
    });
}

export function normalizeStaticPageLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function encodeStaticPageLinkUrl(value: string) {
  const url = normalizeStaticPageLinkUrl(value);
  return url ? encodeURIComponent(url) : null;
}

function decodeLinkUrl(value: string) {
  try {
    return normalizeStaticPageLinkUrl(decodeURIComponent(value));
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
