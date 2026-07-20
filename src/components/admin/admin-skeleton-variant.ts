export type AdminSkeletonVariant = "overview" | "table" | "crawler" | "imports" | "management" | "ads" | "ai" | "settings";

export function getAdminSkeletonVariant(pathname: string): AdminSkeletonVariant {
  if (pathname === "/admin") return "overview";
  if (pathname.startsWith("/admin/crawler")) return "crawler";
  if (pathname.startsWith("/admin/imports")) return "imports";
  if (pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/tags")) return "management";
  if (pathname.startsWith("/admin/ads")) return "ads";
  if (pathname.startsWith("/admin/ai")) return "ai";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "table";
}
