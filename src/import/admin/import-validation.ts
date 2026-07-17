export type ImportIntent = "save" | "regenerate" | "retry" | "needs_fix" | "reject" | "reopen" | "approve";

export function parseImportIntent(value: FormDataEntryValue | null): ImportIntent {
  const intent = String(value ?? "save");
  if (["save", "regenerate", "retry", "needs_fix", "reject", "reopen", "approve"].includes(intent)) return intent as ImportIntent;
  throw new Error("Geçersiz import işlemi.");
}

export function requiredImportReason(value: FormDataEntryValue | null) {
  const reason = String(value ?? "").trim();
  if (reason.length < 3) throw new Error("Bu işlem için en az 3 karakterlik bir gerekçe yazın.");
  return reason.slice(0, 1000);
}

export function parseImportUrl(value: FormDataEntryValue | null, fieldLabel: string, optional = false) {
  const normalized = String(value ?? "").trim();
  if (!normalized && optional) return null;
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`${fieldLabel} geçerli bir HTTP(S) adresi olmalı.`);
  }
  return normalized;
}
