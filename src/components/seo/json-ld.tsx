import { serializeJsonLd, type JsonLd as JsonLdValue } from "@/lib/seo/jsonld";

export function JsonLd({ data }: { data: JsonLdValue | JsonLdValue[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
