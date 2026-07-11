import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminGameById, getAdminGameTaxonomy } from "@/lib/db-games";
import { getAdminCategories } from "@/lib/db-categories";
import { auditGameSeo } from "@/lib/seo/audit";
import { absoluteUrl } from "@/lib/seo/metadata";
import { videoGameJsonLd } from "@/lib/seo/jsonld";
import { updateGameAction } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditGamePage({ params }: Props) {
  const { id } = await params;
  const [game, taxonomy, categories] = await Promise.all([getAdminGameById(id), getAdminGameTaxonomy(id), getAdminCategories()]);

  if (!game) {
    notFound();
  }
  const audit = auditGameSeo({
    title: game.title,
    slug: game.slug,
    seoTitle: game.seoTitle,
    seoDescription: game.seoDescription,
    thumbnailUrl: game.thumbnailUrl,
    shortDescription: game.shortDescription,
    howToPlay: game.howToPlay,
    controls: game.controls,
    primaryCategoryId: game.primaryCategoryId,
    tags: taxonomy.tags,
    gameType: game.gameType,
    embedUrl: game.embedUrl,
    swfUrl: game.swfUrl,
    html5Url: game.html5Url,
    externalUrl: game.externalUrl,
  });

  return (
    <form action={updateGameAction} className="space-y-3">
      <input type="hidden" name="id" value={game.id} />
      <AdminPageHeader
        title="Oyunu Düzenle"
        description={game.title}
        actions={<Button className="h-10 text-sm font-bold">Kaydet</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-md border border-border bg-card p-4">
          <Field label="Oyun adı" name="title" defaultValue={game.title} />
          <Field label="Slug" name="slug" defaultValue={game.slug} />
          <TextArea label="Kısa açıklama" name="short_description" defaultValue={game.shortDescription} rows={3} />
          <TextArea label="Uzun açıklama" name="long_description" defaultValue={game.longDescription} rows={7} />
          <TextArea label="Nasıl oynanır?" name="how_to_play" defaultValue={game.howToPlay} rows={6} />
          <TextArea label="Kontroller - her satır bir madde" name="controls" defaultValue={game.controls.join("\n")} rows={4} />
          <TextArea label="Özellikler - her satır bir madde" name="features" defaultValue={game.features.join("\n")} rows={4} />
          <Field label="Geliştirici" name="developer" defaultValue={game.developer ?? ""} />
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-bold">Kategoriler</legend>
            <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" name="category_ids" value={category.id} defaultChecked={taxonomy.categoryIds.includes(category.id)} />
                  {category.name}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea label="Etiketler - virgül veya satır ile ayır" name="tags" defaultValue={taxonomy.tags.join(", ")} rows={4} />
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">Görsel</h2>
            <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-md bg-muted">
              <Image src={game.thumbnailUrl} alt={game.title} fill sizes="320px" unoptimized className="object-cover" />
            </div>
            <Field label="Thumbnail URL" name="thumbnail_url" defaultValue={game.thumbnailUrl} />
          </section>

          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">Yayın / Player</h2>
            <label className="block text-sm font-bold">
              Status
              <Select name="status" defaultValue={game.status}>
                <SelectTrigger className="mt-1 h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">published</SelectItem>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block text-sm font-bold">
              Game type
              <Select name="game_type" defaultValue={game.gameType}>
                <SelectTrigger className="mt-1 h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iframe">iframe</SelectItem>
                  <SelectItem value="swf">swf</SelectItem>
                  <SelectItem value="html5">html5</SelectItem>
                  <SelectItem value="external">external</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <Field label="Embed URL" name="embed_url" defaultValue={game.embedUrl ?? ""} />
            <Field label="SWF URL" name="swf_url" defaultValue={game.swfUrl ?? ""} />
            <Field label="HTML5 URL" name="html5_url" defaultValue={game.html5Url ?? ""} />
            <Field label="External URL" name="external_url" defaultValue={game.externalUrl ?? ""} />
          </section>

          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">SEO</h2>
            <div className={`rounded-md p-3 text-sm font-bold ${audit.publishable ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
              SEO Skoru: {audit.score}/{audit.total}
              {!audit.publishable ? <p className="mt-1 text-xs font-semibold">Eksikler: {audit.criticalErrors.join(", ")}</p> : null}
            </div>
            <Field label="SEO title" name="seo_title" defaultValue={game.seoTitle} />
            <TextArea label="SEO description" name="seo_description" defaultValue={game.seoDescription} rows={3} />
            <Field label="Open Graph görsel URL" name="og_image_url" defaultValue={game.ogImageUrl ?? ""} />
            <label className="block text-sm font-bold">
              Birincil kategori
              <Select name="primary_category_id" defaultValue={game.primaryCategoryId ?? taxonomy.categoryIds[0] ?? "none"}>
                <SelectTrigger className="mt-1 h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_indexable" defaultChecked={game.isIndexable} /> Arama motorlarında indekslenebilir</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_broken" defaultChecked={game.isBroken} /> Oyun kırık</label>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-5">
              <p className="font-bold">Canonical</p><p className="break-all text-muted-foreground">{absoluteUrl(`/oyun/${game.slug}`)}</p>
              <p className="mt-2 font-bold">SERP önizlemesi</p><p className="mt-1 font-semibold text-primary">{game.seoTitle}</p><p className="text-muted-foreground">{game.seoDescription}</p>
            </div>
            <details className="rounded-md border border-border p-3 text-xs">
              <summary className="cursor-pointer font-bold">Yapılandırılmış veri önizlemesi</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{JSON.stringify(videoGameJsonLd({
                name: game.title,
                description: game.longDescription || game.shortDescription,
                image: game.thumbnailUrl,
                path: `/oyun/${game.slug}`,
                genres: taxonomy.tags,
                developer: game.developer,
                ratingAvg: game.ratingAvg,
                ratingCount: game.ratingCount,
              }), null, 2)}</pre>
            </details>
          </section>
        </aside>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Input name={name} defaultValue={defaultValue} className="mt-1 h-10" />
    </label>
  );
}

function TextArea({ label, name, defaultValue, rows }: { label: string; name: string; defaultValue: string; rows: number }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Textarea name={name} defaultValue={defaultValue} rows={rows} className="mt-1 resize-y" />
    </label>
  );
}
