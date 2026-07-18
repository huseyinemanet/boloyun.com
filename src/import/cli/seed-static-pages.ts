import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { pages } from "@/app/(public)/sayfa/[slug]/page";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment değişkenleri eksik.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows = Object.entries(pages).map(([slug, page]) => {
    const document = { updatedAt: page.updatedAt, sections: page.sections };
    return {
      title: page.title,
      slug,
      content: JSON.stringify(document),
      content_json: document,
      seo_title: page.title,
      seo_description: page.description,
      status: "published",
      updated_at: new Date().toISOString(),
    };
  });
  const { error } = await supabase.from("static_pages").upsert(rows, { onConflict: "slug" });
  if (error) throw new Error(error.message);
  console.log(`${rows.length} statik sayfa Supabase'e kaydedildi.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
