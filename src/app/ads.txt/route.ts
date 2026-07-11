import { getPublicSettings } from "@/lib/db-settings";

export async function GET() {
  const { ads } = await getPublicSettings();
  return new Response(ads.adsTxt, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
