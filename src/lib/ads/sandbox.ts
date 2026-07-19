const AD_DOCUMENT_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "script-src 'unsafe-inline' https:",
  "style-src 'unsafe-inline' https:",
  "img-src data: https:",
  "font-src data: https:",
  "connect-src https:",
  "frame-src https:",
].join("; ");

export function buildSandboxedAdDocument(adCode: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${AD_DOCUMENT_CSP}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%;overflow:hidden;text-align:center;background:transparent}</style></head><body>${adCode}</body></html>`;
}
