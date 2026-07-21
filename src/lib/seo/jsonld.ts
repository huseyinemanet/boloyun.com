import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo/metadata";

export type JsonLd = Record<string, unknown>;

export type BreadcrumbEntry = {
  name: string;
  path: string;
};

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "tr-TR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/arama?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/logo.svg"),
  };
}

export function breadcrumbJsonLd(entries: BreadcrumbEntry[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.path),
    })),
  };
}

export function itemListJsonLd(name: string, items: Array<string | BreadcrumbEntry>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      ...(typeof item === "string"
        ? { url: absoluteUrl(item) }
        : { name: item.name, url: absoluteUrl(item.path) }),
    })),
  };
}

export function videoGameJsonLd(input: {
  name: string;
  description: string;
  image: string;
  path: string;
  genres: string[];
  developer?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
}): JsonLd {
  const value: JsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: input.name,
    description: input.description,
    image: absoluteUrl(input.image),
    url: absoluteUrl(input.path),
    applicationCategory: "Game",
    operatingSystem: "Web Browser",
    genre: input.genres,
    inLanguage: "tr-TR",
  };

  if (input.developer?.trim()) {
    value.author = { "@type": "Organization", name: input.developer.trim() };
  }

  if ((input.ratingCount ?? 0) > 0 && (input.ratingAvg ?? 0) > 0) {
    value.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(input.ratingAvg).toFixed(1),
      ratingCount: input.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return value;
}

export function serializeJsonLd(value: JsonLd | JsonLd[]) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
