import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { GamePlayer } from "@/components/player/game-player";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getImportById } from "@/import/db/game-imports";
import { importStatusLabel } from "@/import/admin/import-status";
import { getPublicSettings } from "@/lib/db-settings";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { ImportNoticeToast } from "../import-notice-toast";
import { ImportReviewActions } from "./import-review-actions";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Import İncele");

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> };

export default async function AdminImportDetailPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  let item;
  try { item = await getImportById(id); } catch { notFound(); }
  const title = item.ai_title_tr || item.original_title || "Başlıksız oyun";
  const readOnly = item.import_status === "approved";
  const settings = await getPublicSettings();
  const source = activeSource(item);
  const sourceAllowed = isGameSourceAllowed(source, settings.security);
  const formId = "import-review-form";

  return <div className="space-y-3">
    <ImportNoticeToast notice={query.notice} error={query.error} basePath={`/admin/imports/${id}`} />
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/admin/imports">İnceleme Kuyruğu</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <AdminPageHeader
      title={title}
      description={<span className="inline-flex items-center gap-2"><Badge variant={item.import_status === "approved" ? "default" : item.import_status === "failed" || item.import_status === "rejected" ? "destructive" : "secondary"}>{importStatusLabel(item.import_status)}</Badge><span>{item.source_domain || item.source_url}</span></span>}
      actions={<ImportReviewActions formId={formId} status={item.import_status} />}
    />

    <form id={formId} action={`/api/admin/imports/${item.id}`} method="post">
      <input type="hidden" name="updated_at" value={item.updated_at} />
      <Tabs defaultValue="content">
        <TabsList><TabsTrigger value="content">İçerik</TabsTrigger><TabsTrigger value="player">Oynatıcı</TabsTrigger><TabsTrigger value="source">Kaynak</TabsTrigger></TabsList>
        <TabsContent value="content" forceMount className="space-y-3 data-[state=inactive]:hidden">
          <Card size="sm"><CardHeader><CardTitle>Türkçe İçerik</CardTitle><CardDescription>Yayınlanacak başlık ve oyun metinleri.</CardDescription></CardHeader><CardContent><FieldGroup>
            <TextField label="Başlık" name="ai_title_tr" value={item.ai_title_tr || item.original_title || ""} readOnly={readOnly} />
            <TextAreaField label="Kısa açıklama" name="ai_short_description_tr" value={item.ai_short_description_tr || item.original_description || ""} rows={3} readOnly={readOnly} />
            <TextAreaField label="Uzun açıklama" name="ai_long_description_tr" value={item.ai_long_description_tr || item.original_description || ""} rows={8} readOnly={readOnly} />
            <TextAreaField label="Nasıl oynanır?" name="ai_how_to_play_tr" value={item.ai_how_to_play_tr || item.original_how_to_play || ""} rows={5} readOnly={readOnly} />
            <div className="grid gap-4 md:grid-cols-2"><TextAreaField label="Kontroller — her satır bir madde" name="ai_controls_tr" value={(item.ai_controls_tr || item.original_controls || []).join("\n")} rows={5} readOnly={readOnly} /><TextAreaField label="Özellikler — her satır bir madde" name="ai_features_tr" value={(item.ai_features_tr || []).join("\n")} rows={5} readOnly={readOnly} /></div>
            <TextField label="Geliştirici" name="ai_developer_tr" value={item.ai_developer_tr || item.original_developer || ""} readOnly={readOnly} />
          </FieldGroup></CardContent></Card>

          <div className="grid gap-3 xl:grid-cols-2">
            <Card size="sm"><CardHeader><CardTitle>SEO</CardTitle></CardHeader><CardContent><FieldGroup><TextField label="SEO title" name="ai_seo_title_tr" value={item.ai_seo_title_tr || ""} readOnly={readOnly} /><TextAreaField label="SEO description" name="ai_seo_description_tr" value={item.ai_seo_description_tr || ""} rows={4} readOnly={readOnly} /></FieldGroup></CardContent></Card>
            <Card size="sm"><CardHeader><CardTitle>Sınıflandırma</CardTitle></CardHeader><CardContent><FieldGroup><TextAreaField label="Kategoriler — virgül veya satır ile ayır" name="ai_categories_tr" value={(item.ai_categories_tr || item.original_categories || []).join(", ")} rows={3} readOnly={readOnly} /><TextAreaField label="Etiketler — virgül veya satır ile ayır" name="ai_tags_tr" value={(item.ai_tags_tr || item.original_tags || []).join(", ")} rows={3} readOnly={readOnly} /></FieldGroup></CardContent></Card>
          </div>

          <Card size="sm"><CardHeader><CardTitle>Kapak</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[160px_1fr]">{item.thumbnail_url ? <Image src={item.thumbnail_url} alt={title} width={160} height={120} unoptimized className="aspect-[4/3] rounded-md object-cover" /> : <div className="aspect-[4/3] rounded-md bg-muted" />}<TextField label="Kapak URL" name="thumbnail_url" value={item.thumbnail_url || ""} readOnly={readOnly} /></CardContent></Card>

          {!readOnly ? <Card size="sm"><CardHeader><CardTitle>İnceleme Notu</CardTitle><CardDescription>Düzeltmeye gönderme veya reddetme işlemlerinde zorunludur.</CardDescription></CardHeader><CardContent><TextAreaField label="Gerekçe" name="reason" value={item.error_message || ""} rows={3} readOnly={false} /></CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="player" forceMount className="space-y-3 data-[state=inactive]:hidden">
          <Card size="sm"><CardHeader><CardTitle>Oyun Önizlemesi</CardTitle><CardDescription>Oyun yalnızca “Oyunu Başlat” düğmesine bastığında yüklenir.</CardDescription></CardHeader><CardContent><GamePlayer game={{ id: `preview-${item.id}`, title, slug: "", gameType: item.detected_game_type || "external", embedUrl: item.detected_embed_url || undefined, swfUrl: item.detected_swf_url || undefined, html5Url: item.detected_html5_url || undefined, externalUrl: item.detected_external_url || item.source_url }} sourceAllowed={sourceAllowed} /></CardContent></Card>
          <Card size="sm"><CardHeader><CardTitle>Oynatıcı Ayarları</CardTitle><CardDescription>{sourceAllowed ? "Oyun kaynağı güvenlik izin listesinde." : "Oyun kaynağı güvenlik izin listesinde değil; yayınlama engellenecek."}</CardDescription></CardHeader><CardContent><FieldGroup>
            <Field><FieldLabel>Oyun tipi</FieldLabel><Select name="detected_game_type" defaultValue={item.detected_game_type || "external"} disabled={readOnly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="iframe">Iframe</SelectItem><SelectItem value="html5">HTML5</SelectItem><SelectItem value="swf">SWF</SelectItem><SelectItem value="external">Dış bağlantı</SelectItem></SelectContent></Select></Field>
            <TextField label="Embed URL" name="detected_embed_url" value={item.detected_embed_url || ""} readOnly={readOnly} />
            <TextField label="HTML5 URL" name="detected_html5_url" value={item.detected_html5_url || ""} readOnly={readOnly} />
            <TextField label="SWF URL" name="detected_swf_url" value={item.detected_swf_url || ""} readOnly={readOnly} />
            <TextField label="Dış bağlantı" name="detected_external_url" value={item.detected_external_url || item.source_url} readOnly={readOnly} />
          </FieldGroup></CardContent></Card>
        </TabsContent>

        <TabsContent value="source" forceMount className="data-[state=inactive]:hidden">
          <Card size="sm"><CardHeader><CardTitle>Orijinal Kaynak</CardTitle><CardDescription>Kaynak veriler karşılaştırma amacıyla salt okunur gösterilir.</CardDescription></CardHeader><CardContent><FieldGroup>
            <Field><FieldLabel>Kaynak URL</FieldLabel><Input value={item.source_url} readOnly /><FieldDescription><a href={item.source_url} target="_blank" rel="noreferrer" className="underline">Kaynağı yeni sekmede aç</a></FieldDescription></Field>
            <TextField label="Orijinal başlık" name="original_title_preview" value={item.original_title || ""} readOnly />
            <TextAreaField label="Orijinal açıklama" name="original_description_preview" value={item.original_description || ""} rows={8} readOnly />
            <TextAreaField label="Orijinal oynanış" name="original_how_to_play_preview" value={item.original_how_to_play || ""} rows={5} readOnly />
          </FieldGroup></CardContent></Card>
        </TabsContent>
      </Tabs>
    </form>
  </div>;
}

function TextField({ label, name, value, readOnly }: { label: string; name: string; value: string; readOnly: boolean }) {
  return <Field><FieldLabel htmlFor={name}>{label}</FieldLabel><Input id={name} name={name} defaultValue={value} readOnly={readOnly} /></Field>;
}

function TextAreaField({ label, name, value, rows, readOnly }: { label: string; name: string; value: string; rows: number; readOnly: boolean }) {
  return <Field><FieldLabel htmlFor={name}>{label}</FieldLabel><Textarea id={name} name={name} defaultValue={value} rows={rows} readOnly={readOnly} /></Field>;
}

function activeSource(item: Awaited<ReturnType<typeof getImportById>>) {
  if (item.detected_game_type === "iframe") return item.detected_embed_url;
  if (item.detected_game_type === "html5") return item.detected_html5_url;
  if (item.detected_game_type === "swf") return item.detected_swf_url;
  return item.detected_external_url || item.source_url;
}
