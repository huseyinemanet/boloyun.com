import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminGameById, getAdminGameTaxonomy } from "@/lib/games/admin-repository";
import { getAdminCategories } from "@/lib/db-categories";
import { auditGameSeo } from "@/lib/seo/audit";
import { absoluteUrl, adminPageMetadata } from "@/lib/seo/metadata";
import { videoGameJsonLd } from "@/lib/seo/jsonld";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Oyunu Düzenle");

export default async function EditGamePage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
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
    <form action={`/api/admin/games/${game.id}`} method="post" className="space-y-3">
      <input type="hidden" name="id" value={game.id} />
      <AdminPageHeader
        title="Oyunu Düzenle"
        description={game.title}
        actions={<Button type="submit" className="h-10 text-sm font-bold">Güncelle</Button>}
      />
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-4">
          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">Ana içerik</h2>
            <Field label="Başlık" name="title" defaultValue={game.title} inputClassName="h-12 text-lg font-semibold" />
            <TextArea label="Kısa açıklama" name="short_description" defaultValue={game.shortDescription} rows={4} />
            <TextArea label="Uzun açıklama" name="long_description" defaultValue={game.longDescription} rows={9} />
          </section>

          <DetailsBox title="Oyun metinleri" description="Nasıl oynanır, kontroller ve özellikler gibi destek metinleri.">
            <div className="grid gap-4">
              <TextArea label="Nasıl oynanır?" name="how_to_play" defaultValue={game.howToPlay} rows={6} />
              <TextArea label="Kontroller - her satır bir madde" name="controls" defaultValue={game.controls.join("\n")} rows={4} />
              <TextArea label="Özellikler - her satır bir madde" name="features" defaultValue={game.features.join("\n")} rows={4} />
            </div>
          </DetailsBox>

          <DetailsBox title="Teknik oynatıcı" description="Slug, oyun tipi, kaynak URL'leri ve geliştirici bilgisi.">
            <div className="grid gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-bold" htmlFor="game-slug">Slug</label>
                <Input id="game-slug" name="slug" defaultValue={game.slug} className="h-10" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Kalıcı bağlantı: {absoluteUrl(`/oyun/${game.slug}`)}
                </p>
              </div>
              <label className="block text-sm font-bold">
                Oynatma türü
                <Select name="game_type" defaultValue={game.gameType}>
                  <SelectTrigger className="mt-1 h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iframe">Iframe ile gömülü oyun</SelectItem>
                    <SelectItem value="swf">Flash / SWF oyun</SelectItem>
                    <SelectItem value="html5">HTML5 oyun dosyası</SelectItem>
                    <SelectItem value="external">Dış bağlantı</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <Field label="Geliştirici" name="developer" defaultValue={game.developer ?? ""} />
              <Field label="Embed URL" name="embed_url" defaultValue={game.embedUrl ?? ""} />
              <Field label="SWF URL" name="swf_url" defaultValue={game.swfUrl ?? ""} />
              <Field label="HTML5 URL" name="html5_url" defaultValue={game.html5Url ?? ""} />
              <Field label="External URL" name="external_url" defaultValue={game.externalUrl ?? ""} />
            </div>
          </DetailsBox>

          <DetailsBox title="SEO" description="Arama sonucu, canonical ve yapılandırılmış veri ayarları.">
            <div className="space-y-3">
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
          </DetailsBox>
        </main>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">Yayınla</h2>
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
          </section>

          <MetaBox title="Öne Çıkan Görsel" className="p-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
              <Image src={game.thumbnailUrl} alt={game.title} fill sizes="320px" unoptimized className="object-cover" />
            </div>
            <Field label="Thumbnail URL" name="thumbnail_url" defaultValue={game.thumbnailUrl} />
          </MetaBox>

          <DetailsBox title="Sınıflandırma" description="Kategori ve etiket ilişkileri." className="p-4">
            <div className="relative -mx-1">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-card to-transparent" />
              <div className="grid max-h-72 gap-2 overflow-y-auto px-1 py-4">
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-card to-transparent" />
            </div>
            <TextArea label="Etiketler - virgül veya satır ile ayır" name="tags" defaultValue={taxonomy.tags.join(", ")} rows={5} />
          </DetailsBox>
        </aside>
      </div>
    </form>
  );
}

function DetailsBox({
  title,
  description,
  children,
  className = "p-4",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`group rounded-md border border-border bg-card ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="block text-lg font-bold">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-muted-foreground group-open:hidden">Aç</span>
        <span className="hidden shrink-0 text-sm font-semibold text-muted-foreground group-open:inline">Kapat</span>
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
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
