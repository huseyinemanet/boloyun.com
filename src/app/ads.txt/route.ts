import { getPublicSettings } from "@/lib/db-settings";
import { cacheControl } from "@/lib/cache-policy";

export async function GET() {
  const { ads } = await getPublicSettings();
  return new Response(ads.adsTxt, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cacheControl("publicData") } });
}
