"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, PlusIcon, RotateCcwIcon, SaveIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { HomepageSectionInput } from "@/lib/db-homepage-sections";
import type { SettingsRecord, SettingsRevision, SettingsSection } from "@/lib/settings/types";
import { renderSeoTemplate } from "@/lib/settings/validation";
import type { SystemStatus } from "@/lib/system-status";
import { clearSettingsCacheAction, restoreSettingsAction, saveSettingsAction } from "./actions";

type Draft = Record<string, unknown>;

const sectionDescriptions: Record<SettingsSection, string> = {
  general: "Marka, iletişim, bakım ve temel site tercihleri.",
  appearance: "Ana sayfa mesajları ve oyun bölümlerinin sıralaması.",
  games: "Oynatıcı ve oyun etkileşimlerinin varsayılan davranışları.",
  seo: "Arama motoru başlıkları, canonical, robots ve sitemap tercihleri.",
  ads: "Global reklam davranışları; slot içerikleri ayrı Reklam Yönetimi’nde kalır.",
  community: "Üyelik, kullanıcı adı, yorum ve etkileşim kuralları.",
  integrations: "Analitik sağlayıcı kimlikleri ve servis bağlantılarının durumu.",
  security: "Dosya yükleme ve oyun iframe domain güvenliği.",
  system: "Uygulama sağlığı, servis durumu ve bakım işlemleri.",
};

export function SettingsForm({
  record,
  revisions,
  homepageSections: initialHomepageSections,
  systemStatus,
}: {
  record: SettingsRecord;
  revisions: SettingsRevision[];
  homepageSections: HomepageSectionInput[];
  systemStatus: SystemStatus | null;
}) {
  const initialDraft = useMemo(() => ({ ...record.value }) as Draft, [record.value]);
  const [baseline, setBaseline] = useState<Draft>(initialDraft);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [version, setVersion] = useState(record.version);
  const [homepageBaseline, setHomepageBaseline] = useState(initialHomepageSections);
  const [homepageSections, setHomepageSections] = useState(initialHomepageSections);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline) || JSON.stringify(homepageSections) !== JSON.stringify(homepageBaseline);
  const changeCount = countChangedKeys(baseline, draft) + (JSON.stringify(homepageSections) === JSON.stringify(homepageBaseline) ? 0 : 1);

  useUnsavedChangesWarning(isDirty);

  function update(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  }

  function reset() {
    setDraft({ ...baseline });
    setHomepageSections(homepageBaseline.map((section) => ({ ...section, manualGameIds: [...section.manualGameIds] })));
    setError(null);
    setMessage("Kaydedilmemiş değişiklikler sıfırlandı.");
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveSettingsAction({ section: record.section, version, value: draft, homepageSections: record.section === "appearance" ? homepageSections : undefined });
        const saved = { ...result.record.value } as Draft;
        setDraft(saved);
        setBaseline(saved);
        setVersion(result.record.version);
        setHomepageBaseline(homepageSections.map((section) => ({ ...section, manualGameIds: [...section.manualGameIds] })));
        setMessage(`Ayarlar sürüm ${result.record.version} olarak kaydedildi.`);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }

  function restore(revision: SettingsRevision) {
    if (isDirty && !window.confirm("Kaydedilmemiş değişiklikler silinecek. Devam edilsin mi?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await restoreSettingsAction(record.section, revision.id, version);
        const saved = { ...result.record.value } as Draft;
        setDraft(saved);
        setBaseline(saved);
        setVersion(result.record.version);
        setMessage(`Sürüm ${revision.version} geri yüklendi ve yeni sürüm ${result.record.version} oluşturuldu.`);
        setHistoryOpen(false);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }

  return (
    <div className="space-y-3 pb-24">
      <div>
        <h2 className="text-lg font-black">{sectionTitle(record.section)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{sectionDescriptions[record.section]}</p>
      </div>

      {renderSection(record.section, draft, update, homepageSections, setHomepageSections, systemStatus)}

      {historyOpen ? <RevisionHistory revisions={revisions} currentVersion={version} pending={pending} onRestore={restore} /> : null}

      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}
      {message ? <p role="status" className="rounded-md border border-success/30 bg-success/10 p-3 text-sm font-semibold text-success">{message}</p> : null}

      <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
        <div>
          <p className="text-sm font-bold">{isDirty ? `${changeCount} değişiklik kaydedilmedi` : "Tüm değişiklikler kaydedildi"}</p>
          <p className="text-xs text-muted-foreground">Sürüm {version}{record.updatedByLabel ? ` · Son değişiklik: ${record.updatedByLabel}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" aria-label="Sürüm Geçmişi" onClick={() => setHistoryOpen((open) => !open)}><HistoryIcon /><span className="hidden sm:inline">Sürüm Geçmişi</span></Button>
          <Button type="button" variant="outline" aria-label="Değişiklikleri Sıfırla" onClick={reset} disabled={!isDirty || pending}><RotateCcwIcon /><span className="hidden sm:inline">Değişiklikleri Sıfırla</span></Button>
          <Button type="button" aria-label="Değişiklikleri Kaydet" onClick={save} disabled={!isDirty || pending || record.section === "system"}><SaveIcon /><span className="hidden sm:inline">{pending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</span></Button>
        </div>
      </div>
    </div>
  );
}

function renderSection(
  section: SettingsSection,
  draft: Draft,
  update: (key: string, value: unknown) => void,
  homepageSections: HomepageSectionInput[],
  setHomepageSections: React.Dispatch<React.SetStateAction<HomepageSectionInput[]>>,
  systemStatus: SystemStatus | null,
) {
  switch (section) {
    case "general": return <GeneralFields draft={draft} update={update} />;
    case "appearance": return <AppearanceFields draft={draft} update={update} sections={homepageSections} setSections={setHomepageSections} />;
    case "games": return <GameFields draft={draft} update={update} />;
    case "seo": return <SeoFields draft={draft} update={update} />;
    case "ads": return <AdFields draft={draft} update={update} />;
    case "community": return <CommunityFields draft={draft} update={update} />;
    case "integrations": return <IntegrationFields draft={draft} update={update} status={systemStatus} />;
    case "security": return <SecurityFields draft={draft} update={update} status={systemStatus} />;
    case "system": return <SystemFields status={systemStatus} />;
  }
}

function GeneralFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Site bilgileri">
      <TextField label="Site adı" value={str(draft.siteName)} onChange={(value) => update("siteName", value)} />
      <TextField label="Kısa slogan" value={str(draft.tagline)} onChange={(value) => update("tagline", value)} />
      <TextAreaField label="Site açıklaması" value={str(draft.description)} onChange={(value) => update("description", value)} />
      <TextField label="İletişim e-postası" type="email" value={str(draft.contactEmail)} onChange={(value) => update("contactEmail", value)} />
    </Card>
    <Card title="Dil ve erişim">
      <TextField label="Site dili" value={str(draft.locale)} disabled onChange={() => undefined} />
      <TextField label="Saat dilimi" value={str(draft.timezone)} onChange={(value) => update("timezone", value)} />
      <ToggleField label="Bakım modu" description="Public sayfalar yerine bakım ekranını gösterir." checked={bool(draft.maintenanceMode)} onChange={(value) => update("maintenanceMode", value)} />
      <ToggleField label="Yeni üyelikler" description="Kayıt sayfasını ve kayıt işlemini açar veya kapatır." checked={bool(draft.registrationsEnabled)} onChange={(value) => update("registrationsEnabled", value)} />
    </Card>
    <Card title="Marka görselleri" className="xl:col-span-2">
      <div className="grid gap-3 md:grid-cols-3">
        <AssetField label="Logo" value={str(draft.logoUrl)} kind="logo" onChange={(value) => update("logoUrl", value)} />
        <AssetField label="Favicon" value={str(draft.faviconUrl)} kind="favicon" onChange={(value) => update("faviconUrl", value)} />
        <AssetField label="Varsayılan kapak" value={str(draft.defaultCoverUrl)} kind="cover" onChange={(value) => update("defaultCoverUrl", value)} />
      </div>
    </Card>
  </div>;
}

function AppearanceFields({ draft, update, sections, setSections }: FieldsProps & { sections: HomepageSectionInput[]; setSections: React.Dispatch<React.SetStateAction<HomepageSectionInput[]>> }) {
  return <div className="space-y-3">
    <div className="grid gap-3 xl:grid-cols-2">
      <Card title="Hero alanı"><TextField label="Başlık" value={str(draft.heroTitle)} onChange={(v) => update("heroTitle", v)} /><TextAreaField label="Açıklama" value={str(draft.heroDescription)} onChange={(v) => update("heroDescription", v)} /></Card>
      <Card title="Duyuru bandı"><ToggleField label="Duyuru bandını göster" checked={bool(draft.announcementEnabled)} onChange={(v) => update("announcementEnabled", v)} /><TextField label="Duyuru metni" value={str(draft.announcementText)} onChange={(v) => update("announcementText", v)} /><TextField label="Bağlantı" value={str(draft.announcementUrl)} onChange={(v) => update("announcementUrl", v)} /></Card>
    </div>
    <HomepageSectionsEditor sections={sections} setSections={setSections} />
  </div>;
}

function GameFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Oynatıcı"><SelectField label="Oynatıcı oranı" value={str(draft.playerAspectRatio)} options={[["16:9", "16:9"], ["4:3", "4:3"]]} onChange={(v) => update("playerAspectRatio", v)} /><NumberField label="Yükleme zaman aşımı (saniye)" value={num(draft.loadTimeoutSeconds)} min={5} max={120} onChange={(v) => update("loadTimeoutSeconds", v)} /><ToggleField label="Tam ekrana izin ver" checked={bool(draft.allowFullscreen)} onChange={(v) => update("allowFullscreen", v)} /><ToggleField label="Misafirler oynayabilsin" checked={bool(draft.allowGuestPlay)} onChange={(v) => update("allowGuestPlay", v)} /></Card>
    <Card title="Oyun etkileşimleri"><ToggleField label="Oynanma sayısını göster" checked={bool(draft.showPlayCount)} onChange={(v) => update("showPlayCount", v)} /><ToggleField label="Beğeniler" checked={bool(draft.likesEnabled)} onChange={(v) => update("likesEnabled", v)} /><ToggleField label="Favoriler" checked={bool(draft.favoritesEnabled)} onChange={(v) => update("favoritesEnabled", v)} /><ToggleField label="Paylaşım" checked={bool(draft.sharingEnabled)} onChange={(v) => update("sharingEnabled", v)} /><SelectField label="Benzer oyun seçimi" value={str(draft.similarGameStrategy)} options={[["taxonomy", "Kategori ve etiket"], ["category", "Aynı kategori"], ["popular", "Popüler oyunlar"]]} onChange={(v) => update("similarGameStrategy", v)} /></Card>
    <StatusCard title="Bozuk oyun bildirimi" /><StatusCard title="Varsayılan yaş derecelendirmesi" />
  </div>;
}

function SeoFields({ draft, update }: FieldsProps) {
  const previewTitle = renderSeoTemplate(str(draft.gameTitleTemplate), { oyun_adı: "Ateş ve Su", site_adı: "Bol Oyun", sayfa: "Oyun" });
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Başlık ve açıklamalar"><TextField label="Varsayılan başlık" value={str(draft.defaultTitle)} onChange={(v) => update("defaultTitle", v)} /><TextField label="Varsayılan title şablonu" value={str(draft.defaultTitleTemplate)} onChange={(v) => update("defaultTitleTemplate", v)} /><TextAreaField label="Varsayılan meta description" value={str(draft.defaultDescription)} onChange={(v) => update("defaultDescription", v)} /><TextField label="Oyun title şablonu" value={str(draft.gameTitleTemplate)} onChange={(v) => update("gameTitleTemplate", v)} /><TextField label="Kategori title şablonu" value={str(draft.categoryTitleTemplate)} onChange={(v) => update("categoryTitleTemplate", v)} /><TextAreaField label="Kategori description şablonu" value={str(draft.categoryDescriptionTemplate)} onChange={(v) => update("categoryDescriptionTemplate", v)} /></Card>
    <Card title="Google sonucu önizlemesi"><div className="rounded-md border border-border bg-background p-4"><p className="text-xs text-muted-foreground">boloyun.com › oyun › ates-ve-su</p><p className="mt-1 text-lg font-medium text-blue-400">{previewTitle}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{str(draft.defaultDescription)}</p></div><p className="text-xs text-muted-foreground">Desteklenen değişkenler: {"{{site_adı}}"}, {"{{oyun_adı}}"}, {"{{kategori_adı}}"}, {"{{sayfa}}"}</p></Card>
    <Card title="Alan adı ve görseller"><TextField label="Canonical domain" value={str(draft.canonicalDomain)} onChange={(v) => update("canonicalDomain", v)} /><AssetField label="Open Graph görseli" kind="cover" value={str(draft.openGraphImageUrl)} onChange={(v) => update("openGraphImageUrl", v)} /></Card>
    <Card title="Tarama ve indeks"><ListField label="Robots.txt engel yolları" value={strings(draft.robotsDisallow)} onChange={(v) => update("robotsDisallow", v)} /><ToggleField label="XML sitemap" checked={bool(draft.sitemapEnabled)} onChange={(v) => update("sitemapEnabled", v)} /><ToggleField label="Etiketleri sitemap’e ekle" checked={bool(draft.sitemapIncludeTags)} onChange={(v) => update("sitemapIncludeTags", v)} /><ToggleField label="Statik sayfaları sitemap’e ekle" checked={bool(draft.sitemapIncludeStaticPages)} onChange={(v) => update("sitemapIncludeStaticPages", v)} /><ToggleField label="Arama sonuçlarını indeksle" checked={bool(draft.searchIndexable)} onChange={(v) => update("searchIndexable", v)} /><ToggleField label="Yapılandırılmış veri" checked={bool(draft.structuredDataEnabled)} onChange={(v) => update("structuredDataEnabled", v)} /></Card>
    <Card title="Webmaster doğrulama"><TextField label="Google Search Console kodu" value={str(draft.googleVerification)} onChange={(v) => update("googleVerification", v)} /><TextField label="Bing Webmaster kodu" value={str(draft.bingVerification)} onChange={(v) => update("bingVerification", v)} /></Card>
    <StatusCard title="Eski URL yönlendirmeleri" />
  </div>;
}

function AdFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Global reklam davranışı"><ToggleField label="Reklamları etkinleştir" checked={bool(draft.enabled)} onChange={(v) => update("enabled", v)} /><ToggleField label="Üyelere reklam göster" checked={bool(draft.showToMembers)} onChange={(v) => update("showToMembers", v)} /><ToggleField label="Oyun açılış reklamı" checked={bool(draft.preRollEnabled)} onChange={(v) => update("preRollEnabled", v)} /><NumberField label="Reklam geçme süresi" value={num(draft.preRollSkipSeconds)} min={0} max={60} onChange={(v) => update("preRollSkipSeconds", v)} /></Card><Card title="Reklam içerikleri"><p className="text-sm text-muted-foreground">Header, ana sayfa, kategori ve oyun slotlarının kodları ayrı reklam yöneticisinde tutulur.</p><Button asChild variant="outline"><Link href="/admin/ads">Reklam Yönetimi’ni Aç</Link></Button><TextAreaField label="ads.txt içeriği" value={str(draft.adsTxt)} rows={8} onChange={(v) => update("adsTxt", v)} /></Card></div>;
}

function CommunityFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Üyelik"><ToggleField label="Yeni üyelikler" checked={bool(draft.registrationsEnabled)} onChange={(v) => update("registrationsEnabled", v)} /><ToggleField label="E-posta doğrulaması" checked={bool(draft.emailVerificationRequired)} onChange={(v) => update("emailVerificationRequired", v)} /><div className="grid grid-cols-2 gap-3"><NumberField label="Minimum kullanıcı adı" value={num(draft.usernameMinLength)} min={3} max={20} onChange={(v) => update("usernameMinLength", v)} /><NumberField label="Maksimum kullanıcı adı" value={num(draft.usernameMaxLength)} min={3} max={50} onChange={(v) => update("usernameMaxLength", v)} /></div><TextField label="Kullanıcı adı deseni" value={str(draft.usernamePattern)} onChange={(v) => update("usernamePattern", v)} /><NumberField label="Minimum yaş (0 = kapalı)" value={num(draft.minimumAge)} min={0} max={18} onChange={(v) => update("minimumAge", v)} /><ToggleField label="Profil fotoğrafı" checked={bool(draft.profilePhotoEnabled)} onChange={(v) => update("profilePhotoEnabled", v)} /></Card><Card title="Yorumlar ve etkileşim"><ToggleField label="Yorum sistemi" checked={bool(draft.commentsEnabled)} onChange={(v) => update("commentsEnabled", v)} /><ToggleField label="Yorumlar ön onaya düşsün" checked={bool(draft.commentsRequireApproval)} onChange={(v) => update("commentsRequireApproval", v)} /><ListField label="Yasaklı kelimeler" value={strings(draft.blockedWords)} onChange={(v) => update("blockedWords", v)} /><NumberField label="Günlük yorum limiti" value={num(draft.dailyCommentLimit)} min={1} max={500} onChange={(v) => update("dailyCommentLimit", v)} /><ToggleField label="Oyun puanlama" checked={bool(draft.ratingsEnabled)} onChange={(v) => update("ratingsEnabled", v)} /><ToggleField label="Favoriler" checked={bool(draft.favoritesEnabled)} onChange={(v) => update("favoritesEnabled", v)} /></Card></div>;
}

function IntegrationFields({ draft, update, status }: FieldsProps & { status: SystemStatus | null }) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Analitik kimlikleri"><TextField label="Google Analytics (G-...)" value={str(draft.googleAnalyticsId)} onChange={(v) => update("googleAnalyticsId", v)} /><TextField label="Google Tag Manager (GTM-...)" value={str(draft.googleTagManagerId)} onChange={(v) => update("googleTagManagerId", v)} /><TextField label="Microsoft Clarity" value={str(draft.clarityProjectId)} onChange={(v) => update("clarityProjectId", v)} /><TextField label="Meta Pixel" value={str(draft.metaPixelId)} onChange={(v) => update("metaPixelId", v)} /><ToggleField label="Consent Mode" description="Google Analytics varsayılan olarak izin reddedilmiş durumda başlatılır; pazarlama scriptleri izin verilene kadar yüklenmez." checked={bool(draft.consentModeEnabled)} onChange={(v) => update("consentModeEnabled", v)} /></Card><div className="grid gap-3 sm:grid-cols-2"><StatusCard title="Cloudflare R2" status={status?.r2} /><StatusCard title="CDN" status={status?.cdn} /><StatusCard title="E-posta servisi (Brevo)" status={status?.email} /><StatusCard title="Webhook" /></div></div>;
}

function SecurityFields({ draft, update, status }: FieldsProps & { status: SystemStatus | null }) {
  return <div className="space-y-3"><div className="grid gap-3 xl:grid-cols-2"><Card title="Dosya yükleme"><NumberField label="Maksimum yükleme boyutu (MB)" value={num(draft.uploadMaxMb)} min={1} max={20} onChange={(v) => update("uploadMaxMb", v)} /><ListField label="İzin verilen MIME türleri" value={strings(draft.allowedUploadMimeTypes)} onChange={(v) => update("allowedUploadMimeTypes", v)} /></Card><Card title="Iframe domain izin listesi"><ToggleField label="İzin listesini zorunlu tut" description="Açılmadan önce mevcut oyun domainlerini aşağıdaki listeye ekleyin." checked={bool(draft.enforceIframeAllowlist)} onChange={(v) => update("enforceIframeAllowlist", v)} /><ListField label="İzin verilen domainler" value={strings(draft.iframeAllowlist)} onChange={(v) => update("iframeAllowlist", v)} />{status?.detectedIframeDomains.length ? <div><p className="text-xs font-bold">Mevcut oyunlarda algılanan domainler</p><p className="mt-1 break-words text-xs text-muted-foreground">{status.detectedIframeDomains.join(", ")}</p></div> : null}</Card></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><StatusCard title="İki aşamalı doğrulama" /><StatusCard title="CAPTCHA" /><StatusCard title="IP engelleme" /><StatusCard title="Giriş denemesi sınırı" /><StatusCard title="Güvenlik olayları" /></div></div>;
}

function SystemFields({ status }: { status: SystemStatus | null }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SystemCard title="Uygulama sürümü" value={status?.appVersion ?? "-"} /><SystemCard title="Veritabanı" value={status?.database ?? "Bağlantı yok"} /><SystemCard title="Cloudflare R2" value={status?.r2 ?? "Yapılandırılmadı"} /><SystemCard title="Son import hareketi" value={status?.lastImportAt ? formatRelativeDate(status.lastImportAt) : "Kayıt yok"} /></div><Card title="Bakım işlemleri"><p className="text-sm text-muted-foreground">Ayarlar ve public oyun listeleri için kullanılan Next veri önbelleklerini geçersiz kılar.</p><Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(async () => { const result = await clearSettingsCacheAction(); setMessage(`Önbellek ${new Date(result.clearedAt).toLocaleTimeString("tr-TR")} tarihinde temizlendi.`); })}>{pending ? "Temizleniyor…" : "Önbelleği Temizle"}</Button>{message ? <p className="text-sm font-semibold text-success">{message}</p> : null}</Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatusCard title="Redis" /><StatusCard title="Arama servisi" /><StatusCard title="Yedekleme" /><StatusCard title="Arka plan görevleri" /></div></div>;
}

function formatRelativeDate(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  if (!Number.isFinite(diffMs)) return "Bilinmiyor";
  if (absMs < 60_000) return "az önce";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const [unit, unitMs] = units.find(([, duration]) => absMs >= duration) ?? units.at(-1)!;
  return new Intl.RelativeTimeFormat("tr-TR", { numeric: "always" }).format(Math.round(diffMs / unitMs), unit);
}

function HomepageSectionsEditor({ sections, setSections }: { sections: HomepageSectionInput[]; setSections: React.Dispatch<React.SetStateAction<HomepageSectionInput[]>> }) {
  function updateSection(index: number, patch: Partial<HomepageSectionInput>) { setSections((current) => current.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section)); }
  function move(index: number, direction: -1 | 1) { setSections((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, order) => ({ ...item, sortOrder: order })); }); }
  function add() { setSections((current) => [...current, { id: null, title: "Yeni Bölüm", sectionType: "latest_games", sourceType: "", sourceId: "", manualGameIds: [], limitCount: 12, sortOrder: current.length, visibility: "all", status: "active" }]); }
  return <Card title="Ana sayfa bölümleri" actions={<Button type="button" size="sm" variant="outline" onClick={add}><PlusIcon />Bölüm Ekle</Button>}><p className="text-xs text-muted-foreground">Bölümler yukarıdan aşağıya ana sayfadaki sırayı belirler. Manuel oyun kimliklerini her satıra bir UUID gelecek şekilde girin.</p>{sections.length ? <div className="space-y-3">{sections.map((section, index) => <div key={section.id ?? `new-${index}`} className="rounded-md border border-border bg-background p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-black">{index + 1}. bölüm</p><div className="flex gap-1"><Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Yukarı taşı"><ArrowUpIcon /></Button><Button type="button" size="icon" variant="ghost" disabled={index === sections.length - 1} onClick={() => move(index, 1)} aria-label="Aşağı taşı"><ArrowDownIcon /></Button><Button type="button" size="icon" variant="ghost" onClick={() => setSections((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Bölümü sil"><Trash2Icon /></Button></div></div><div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><TextField label="Başlık" value={section.title} onChange={(v) => updateSection(index, { title: v })} /><SelectField label="Tür" value={section.sectionType} options={sectionTypeOptions} onChange={(v) => updateSection(index, { sectionType: v as HomepageSectionInput["sectionType"] })} /><NumberField label="Oyun sayısı" value={section.limitCount} min={1} max={60} onChange={(v) => updateSection(index, { limitCount: v })} /><SelectField label="Durum" value={section.status} options={[["active", "Aktif"], ["inactive", "Kapalı"]]} onChange={(v) => updateSection(index, { status: v as "active" | "inactive" })} /></div>{section.sectionType === "category_based" || section.sectionType === "tag_based" ? <div className="mt-3"><TextField label="Kaynak UUID" value={section.sourceId} onChange={(v) => updateSection(index, { sourceId: v, sourceType: section.sectionType === "category_based" ? "category" : "tag" })} /></div> : null}{section.sectionType === "manual_games" ? <div className="mt-3"><ListField label="Manuel oyun UUID’leri" value={section.manualGameIds} onChange={(v) => updateSection(index, { manualGameIds: v })} /></div> : null}</div>)}</div> : <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Henüz özel bölüm yok. Mevcut sabit ana sayfa düzeni fallback olarak kullanılacak.</p>}</Card>;
}

const sectionTypeOptions: Array<[string, string]> = [["latest_games", "Yeni oyunlar"], ["popular_games", "Popüler oyunlar"], ["trending_games", "Trend oyunlar"], ["manual_games", "Manuel oyunlar"], ["category_based", "Kategori bazlı"], ["tag_based", "Etiket bazlı"], ["random_picks", "Rastgele seçimler"]];

function Card({ title, children, className = "", actions }: { title: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) { return <section className={`rounded-md border border-border bg-card p-4 ${className}`}><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">{title}</h3>{actions}</div><div className="grid gap-3">{children}</div></section>; }
function StatusCard({ title, status = "Yapılandırılmadı" }: { title: string; status?: string }) { return <div className="rounded-md border border-border bg-card p-4"><p className="text-sm font-black">{title}</p><p className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${status === "Yapılandırıldı" || status === "Bağlı" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{status}</p></div>; }
function SystemCard({ title, value }: { title: string; value: string }) { return <div className="rounded-md border border-border bg-card p-4"><p className="text-xs font-bold text-muted-foreground">{title}</p><p className="mt-2 text-lg font-black">{value}</p></div>; }
function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) { return <label className="grid gap-1 text-sm font-bold">{label}<Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) { return <label className="grid gap-1 text-sm font-bold">{label}<Textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) { return <label className="grid gap-1 text-sm font-bold">{label}<Input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="grid gap-1 text-sm font-bold">{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></label>; }
function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span><span className="block text-sm font-bold">{label}</span>{description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}</span></label>; }
function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) { return <label className="grid gap-1 text-sm font-bold">{label}<Textarea value={value.join("\n")} rows={5} onChange={(event) => onChange(event.target.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))} /></label>; }

function AssetField({ label, value, kind, onChange }: { label: string; value: string; kind: "logo" | "favicon" | "cover"; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file?: File) { if (!file) return; setUploading(true); setError(null); const body = new FormData(); body.set("file", file); body.set("kind", kind); try { const response = await fetch("/api/admin/settings/assets", { method: "POST", body }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) throw new Error(result.error || "Dosya yüklenemedi."); onChange(result.url); } catch (caught) { setError(errorMessage(caught)); } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; } }
  return <div className="grid gap-2"><TextField label={label} value={value} onChange={onChange} /><input ref={inputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon" onChange={(event) => upload(event.target.files?.[0])} /><Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}><UploadIcon />{uploading ? "Yükleniyor…" : "R2’ye Yükle"}</Button>{error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}</div>;
}

function RevisionHistory({ revisions, currentVersion, pending, onRestore }: { revisions: SettingsRevision[]; currentVersion: number; pending: boolean; onRestore: (revision: SettingsRevision) => void }) { return <Card title="Sürüm geçmişi">{revisions.length ? revisions.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"><div><p className="text-sm font-black">Sürüm {revision.version}{revision.version === currentVersion ? " · Güncel" : ""}</p><p className="text-xs text-muted-foreground">{new Date(revision.createdAt).toLocaleString("tr-TR")} · {revision.changedByLabel || "Sistem"}</p><p className="mt-1 text-xs text-muted-foreground">{revision.changedKeys.length ? revision.changedKeys.join(", ") : "Değişiklik yok"}</p></div><Button type="button" variant="outline" disabled={pending || revision.version === currentVersion} onClick={() => onRestore(revision)}>Bu Sürüme Dön</Button></div>) : <p className="text-sm text-muted-foreground">Sürüm geçmişi bulunamadı.</p>}</Card>; }

function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => { if (!isDirty) return; const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; const click = (event: MouseEvent) => { const anchor = (event.target as Element | null)?.closest("a"); if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return; if (!window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?")) { event.preventDefault(); event.stopPropagation(); } }; window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", click, true); return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); }; }, [isDirty]);
}

function countChangedKeys(left: Draft, right: Draft) { return [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key])).length; }
function sectionTitle(section: SettingsSection) { return ({ general: "Genel", appearance: "Görünüm ve Ana Sayfa", games: "Oyunlar", seo: "SEO", ads: "Reklamlar", community: "Üyelik ve Yorumlar", integrations: "Entegrasyonlar", security: "Güvenlik", system: "Sistem" } as const)[section]; }
function str(value: unknown) { return typeof value === "string" ? value : ""; }
function bool(value: unknown) { return value === true; }
function num(value: unknown) { return typeof value === "number" ? value : 0; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "İşlem tamamlanamadı."; }
type FieldsProps = { draft: Draft; update: (key: string, value: unknown) => void };
