export function isAdminMfaSatisfied(currentLevel: string | null | undefined) {
  return currentLevel === "aal2";
}

export function adminMfaPath(next = "/admin") {
  return `/hesap-guvenligi?next=${encodeURIComponent(next)}`;
}
