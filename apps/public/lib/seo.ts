import type { Metadata } from "next";
import type { StaticSettings } from "./data";

export const SITE_URL = (process.env.SITE_URL || "https://boloyun.com").replace(/\/$/, "");

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function metadata(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  indexable?: boolean;
  settings?: StaticSettings;
}): Metadata {
  const siteName = input.settings?.general.siteName ?? "Bol Oyun";
  const image = input.image || input.settings?.seo.openGraphImageUrl || "/logo.svg";
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    robots: input.indexable === false ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      siteName,
      type: "website",
      locale: "tr_TR",
      images: [{ url: absoluteUrl(image), alt: input.title }],
    },
    twitter: { card: "summary_large_image", title: input.title, description: input.description, images: [absoluteUrl(image)] },
  };
}

export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
