import { getSettings } from "@public/lib/data";

export const dynamic = "force-static";

export async function GET() {
  const settings = await getSettings();
  return new Response(settings.ads.adsTxt || "", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
