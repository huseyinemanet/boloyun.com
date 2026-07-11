import type { Metadata } from "next";

export const SITE_NAME = "Bol Oyun";
export const SITE_URL = (process.env.SITE_URL || "https://boloyun.com").replace(/\/$/, "");
export const DEFAULT_TITLE = "Ücretsiz Oyunlar Oyna";
export const DEFAULT_DESCRIPTION =
  "En sevilen mini oyunları, klasik Flash oyunları, araba, aksiyon, spor ve beceri oyunlarını ücretsiz oyna.";
export const DEFAULT_OG_IMAGE = "/opengraph-image";

export function absoluteUrl(path = "/", baseUrl = SITE_URL) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata({
  title,
  description,
  canonicalPath,
  image,
  indexable = true,
  siteName = SITE_NAME,
  baseUrl = SITE_URL,
  defaultImage = DEFAULT_OG_IMAGE,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string | null;
  indexable?: boolean;
  siteName?: string;
  baseUrl?: string;
  defaultImage?: string;
}): Metadata {
  const canonical = absoluteUrl(canonicalPath, baseUrl);
  const socialImage = absoluteUrl(image || defaultImage, baseUrl);

  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName,
      title,
      description,
      url: canonical,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export const privatePageMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};
