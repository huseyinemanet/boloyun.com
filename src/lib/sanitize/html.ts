export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeSvgInput(value: string) {
  const input = value.trim();
  if (!input || !/^<svg\b/i.test(input) || !/<\/svg>$/i.test(input)) return "";
  const allowedTags = new Set(["svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "title", "desc"]);
  const allowedAttributes = new Set([
    "xmlns", "viewbox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "d", "cx", "cy", "r", "rx", "ry", "x", "y",
    "x1", "y1", "x2", "y2", "points", "transform", "opacity", "fill-rule", "clip-rule", "role", "aria-hidden",
  ]);
  const output: string[] = [];
  const stack: string[] = [];
  const tokens = input.match(/<[^>]*>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (!token.startsWith("<")) {
      output.push(escapeText(token));
      continue;
    }
    const closing = token.match(/^<\/\s*([a-z0-9-]+)\s*>$/i);
    if (closing) {
      const tag = closing[1].toLowerCase();
      if (!allowedTags.has(tag) || stack.pop() !== tag) return "";
      output.push(`</${tag}>`);
      continue;
    }
    const opening = token.match(/^<\s*([a-z0-9-]+)([\s\S]*?)(\/?)>$/i);
    if (!opening) return "";
    const tag = opening[1].toLowerCase();
    if (!allowedTags.has(tag)) return "";
    const attributes = sanitizeAttributes(opening[2], allowedAttributes);
    if (attributes === null) return "";
    const selfClosing = opening[3] === "/";
    output.push(`<${tag}${attributes}${selfClosing ? "/" : ""}>`);
    if (!selfClosing) stack.push(tag);
  }
  return stack.length === 0 ? output.join("") : "";
}

function sanitizeAttributes(value: string, allowed: Set<string>) {
  let rest = value;
  const result: string[] = [];
  const pattern = /^\s+([a-zA-Z][\w:-]*)\s*=\s*("[^"]*"|'[^']*')/;
  while (rest.trim()) {
    const match = rest.match(pattern);
    if (!match) return null;
    const name = match[1].toLowerCase();
    if (!allowed.has(name) || name.startsWith("on") || name.includes(":")) return null;
    const raw = match[2].slice(1, -1);
    if (/url\s*\(|javascript:|data:|[<>`]/i.test(raw)) return null;
    result.push(` ${name === "viewbox" ? "viewBox" : name}="${escapeAttribute(raw)}"`);
    rest = rest.slice(match[0].length);
  }
  return result.join("");
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function escapeText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
