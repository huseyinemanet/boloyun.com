import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
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
        actions={<Button type="submit" className="h-10 text-sm font-bold">Güncelle</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-4">
          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <Field label="Başlık" name="title" defaultValue={game.title} inputClassName="h-12 text-lg font-semibold" />
            <div className="grid gap-1">
              <label className="text-sm font-semibold text-muted-foreground" htmlFor="game-slug">Kalıcı bağlantı</label>
              <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">{absoluteUrl("/oyun/")}</span>
                <Input id="game-slug" name="slug" defaultValue={game.slug} className="h-8 min-w-52 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
              </div>
            </div>
          </section>

          <MetaBox title="İçerik">
            <TextArea label="Uzun açıklama" name="long_description" defaultValue={game.longDescription} rows={10} />
          </MetaBox>

          <MetaBox title="Özet">
            <TextArea label="Kısa açıklama" name="short_description" defaultValue={game.shortDescription} rows={4} />
          </MetaBox>

          <MetaBox title="Oyun Bilgileri">
            <div className="grid gap-4 md:grid-cols-2">
              <TextArea label="Nasıl oynanır?" name="how_to_play" defaultValue={game.howToPlay} rows={6} />
              <div className="space-y-4">
                <TextArea label="Kontroller - her satır bir madde" name="controls" defaultValue={game.controls.join("\n")} rows={4} />
                <TextArea label="Özellikler - her satır bir madde" name="features" defaultValue={game.features.join("\n")} rows={4} />
              </div>
            </div>
          </MetaBox>

          <MetaBox title="Oynatıcı">
            <div className="grid gap-4 md:grid-cols-2">
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
              <Field label="Geliştirici" name="developer" defaultValue={game.developer ?? ""} />
              <Field label="Embed URL" name="embed_url" defaultValue={game.embedUrl ?? ""} />
              <Field label="SWF URL" name="swf_url" defaultValue={game.swfUrl ?? ""} />
              <Field label="HTML5 URL" name="html5_url" defaultValue={game.html5Url ?? ""} />
              <Field label="External URL" name="external_url" defaultValue={game.externalUrl ?? ""} />
            </div>
          </MetaBox>

          <details className="group rounded-md border border-border bg-card p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span>
                <span className="block text-lg font-bold">SEO</span>
                <span className="mt-1 block text-sm text-muted-foreground">Arama sonucu, canonical ve yapılandırılmış veri ayarları.</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-muted-foreground group-open:hidden">Aç</span>
              <span className="hidden shrink-0 text-sm font-semibold text-muted-foreground group-open:inline">Kapat</span>
            </summary>
            <div className="mt-4 space-y-3">
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
              <AdminCheckboxField name="is_indexable" label="Arama motorlarında indekslenebilir" defaultChecked={game.isIndexable} />
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
            </div>
          </details>
        </main>

        <aside className="space-y-4">
          <section className="sticky top-24 space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Yayınla</h2>
              <Button type="submit" size="sm">Güncelle</Button>
            </div>
            <label className="block text-sm font-bold">
              Durum
              <Select name="status" defaultValue={game.status}>
                <SelectTrigger className="mt-1 h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Yayında</SelectItem>
                  <SelectItem value="draft">Taslak</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <AdminCheckboxField name="is_broken" label="Oyun kırık" defaultChecked={game.isBroken} />
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/oyun/${game.slug}`} target="_blank" rel="noreferrer">Önizle</Link>
              </Button>
              <span className="text-muted-foreground">ID: {game.id.slice(0, 8)}</span>
            </div>
          </section>

          <MetaBox title="Öne Çıkan Görsel" className="p-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
              <Image src={game.thumbnailUrl} alt={game.title} fill sizes="320px" unoptimized className="object-cover" />
            </div>
            <Field label="Thumbnail URL" name="thumbnail_url" defaultValue={game.thumbnailUrl} />
          </MetaBox>

          <MetaBox title="Kategoriler" className="p-4">
            <div className="grid max-h-72 gap-2 overflow-y-auto">
              {categories.map((category) => (
                <AdminCheckboxField
                  key={category.id}
                  name="category_ids"
                  value={category.id}
                  label={category.name}
                  defaultChecked={taxonomy.categoryIds.includes(category.id)}
                />
              ))}
            </div>
          </MetaBox>

          <MetaBox title="Etiketler" className="p-4">
            <TextArea label="Virgül veya satır ile ayır" name="tags" defaultValue={taxonomy.tags.join(", ")} rows={5} />
          </MetaBox>
        </aside>
      </div>
    </form>
  );
}

function MetaBox({ title, children, className = "p-4" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 rounded-md border border-border bg-card ${className}`}>
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, defaultValue, inputClassName }: { label: string; name: string; defaultValue: string; inputClassName?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Input name={name} defaultValue={defaultValue} className={`mt-1 h-10 ${inputClassName ?? ""}`} />
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
