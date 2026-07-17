"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { IconAddSectionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconAddSectionFillDuo18";
import { IconCloudUploadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCloudUploadFillDuo18";
import { IconDatabaseCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconDatabaseCheckFillDuo18";
import { IconMediaPauseFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPauseFillDuo18";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";
import { IconSavedItemsFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSavedItemsFillDuo18";
import { IconUndo3FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUndo3FillDuo18";
import { IconVersionsFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconVersionsFillDuo18";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { SoundButton } from "@/components/audio/sound-button";
import { SoundLink } from "@/components/audio/sound-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { HomepageSectionInput } from "@/lib/db-homepage-sections";
import type { SettingsRecord, SettingsSection } from "@/lib/settings/types";
import { renderSeoTemplate } from "@/lib/settings/validation";
import type { SystemStatus } from "@/lib/system-status";
import { clearSettingsCacheAction, saveSettingsAction } from "./actions";

type Draft = Record<string, unknown>;

const sectionDescriptions: Record<SettingsSection, string> = {
  general: "Marka, bakım ve temel erişim tercihleri.",
  appearance: "Ana sayfa mesajları ve oyun bölümlerinin sıralaması.",
  games: "Oynatıcı ve oyun etkileşimlerinin varsayılan davranışları.",
  seo: "Arama motoru başlıkları, canonical, robots ve sitemap tercihleri.",
  ads: "Global reklam davranışları; slot içerikleri ayrı Reklam Yönetimi’nde kalır.",
  community: "Üyelik, kullanıcı adı, yorum ve etkileşim kuralları.",
  integrations: "Analitik sağlayıcı kimlikleri ve servis bağlantılarının durumu.",
  media: "Kapak görselleri, yükleme düzeni ve varsayılan medya tercihleri.",
  permalinks: "Public oyun, kategori, etiket ve sayfa bağlantılarının temel yapısı.",
  security: "Dosya yükleme ve oyun iframe domain güvenliği.",
  audio: "Site genelindeki tıklama sesini ve kullanılan ses dosyasını yönet.",
  system: "Uygulama sağlığı, servis durumu ve bakım işlemleri.",
};

export function SettingsForm({
  record,
  homepageSections: initialHomepageSections,
  systemStatus,
}: {
  record: SettingsRecord;
  homepageSections: HomepageSectionInput[];
  systemStatus: SystemStatus | null;
}) {
  const initialDraft = useMemo(() => ({ ...record.value }) as Draft, [record.value]);
  const [baseline, setBaseline] = useState<Draft>(initialDraft);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [homepageBaseline, setHomepageBaseline] = useState(initialHomepageSections);
  const [homepageSections, setHomepageSections] = useState(initialHomepageSections);
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
    toast.success("Kaydedilmemiş değişiklikler sıfırlandı.");
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveSettingsAction({ section: record.section, value: draft, homepageSections: record.section === "appearance" ? homepageSections : undefined });
        const saved = { ...result.record.value } as Draft;
        setDraft(saved);
        setBaseline(saved);
        setHomepageBaseline(homepageSections.map((section) => ({ ...section, manualGameIds: [...section.manualGameIds] })));
        setMessage("Ayarlar kaydedildi.");
        toast.success("Ayarlar kaydedildi.");
      } catch (caught) {
        const message = errorMessage(caught);
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-3 pb-24">
      <div>
        <h2 className="text-lg font-semibold">{sectionTitle(record.section)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{sectionDescriptions[record.section]}</p>
      </div>

      {renderSection(record.section, draft, update, homepageSections, setHomepageSections, systemStatus)}

      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}
      {message ? <p role="status" className="rounded-md border border-success/30 bg-success/10 p-3 text-sm font-semibold text-success">{message}</p> : null}

      <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
        <div>
          <p className="text-sm font-bold">{isDirty ? `${changeCount} değişiklik kaydedilmedi` : "Tüm değişiklikler kaydedildi"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SoundButton type="button" variant="outline" aria-label="Değişiklikleri Sıfırla" onClick={reset} disabled={!isDirty || pending}><IconUndo3FillDuo18 className="size-4" /><span className="hidden sm:inline">Değişiklikleri Sıfırla</span></SoundButton>
          <SoundButton type="button" aria-label="Değişiklikleri Kaydet" onClick={save} disabled={!isDirty || pending || record.section === "system"}><IconSavedItemsFillDuo18 className="size-4" /><span className="hidden sm:inline">{pending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</span></SoundButton>
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
    case "media": return <MediaFields draft={draft} update={update} />;
    case "permalinks": return <PermalinkFields draft={draft} update={update} />;
    case "security": return <SecurityFields draft={draft} update={update} status={systemStatus} />;
    case "audio": return <AudioFields draft={draft} update={update} />;
    case "system": return <SystemFields status={systemStatus} />;
  }
}

function GeneralFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Site bilgileri">
      <TextField label="Site adı" value={str(draft.siteName)} onChange={(value) => update("siteName", value)} />
    </Card>
    <Card title="Erişim">
      <ToggleField label="Bakım modu" description="Public sayfalar yerine bakım ekranını gösterir." checked={bool(draft.maintenanceMode)} onChange={(value) => update("maintenanceMode", value)} />
      <ToggleField label="Yeni üyelikler" description="Kayıt sayfasını ve kayıt işlemini açar veya kapatır." checked={bool(draft.registrationsEnabled)} onChange={(value) => update("registrationsEnabled", value)} />
    </Card>
    <Card title="Marka görselleri" className="xl:col-span-2">
      <div className="grid gap-3 md:grid-cols-2">
        <AssetField label="Logo" value={str(draft.logoUrl)} kind="logo" onChange={(value) => update("logoUrl", value)} />
        <AssetField label="Favicon" value={str(draft.faviconUrl)} kind="favicon" onChange={(value) => update("faviconUrl", value)} />
      </div>
    </Card>
    <Card title="Oyun verilerini dışa aktar" className="xl:col-span-2">
      <p className="text-sm leading-6 text-muted-foreground">Tüm oyunları; Türkçe açıklamalar, nasıl oynanır metni, satır satır kontroller ve özellikler, oynatıcı URL’leri, kategori, etiket, SEO ve teknik alanlarla birlikte CSV olarak indirir.</p>
      <p className="text-xs leading-5 text-muted-foreground">Büyük oyun arşivi sunucuda parçalar halinde hazırlanır. İndirme tamamlanana kadar bu sekmeyi kapatmayın.</p>
      <Button asChild variant="outline" className="w-fit">
        <a href="/api/admin/games/export" download data-click-sound="true"><DownloadIcon className="size-4" />Tüm Oyunları CSV İndir</a>
      </Button>
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
  </div>;
}

function SeoFields({ draft, update }: FieldsProps) {
  const previewTitle = renderSeoTemplate(str(draft.gameTitleTemplate), { oyun_adı: "Ateş ve Su", site_adı: "Bol Oyun", sayfa: "Oyun" });
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Başlık ve açıklamalar"><TextField label="Varsayılan başlık" value={str(draft.defaultTitle)} onChange={(v) => update("defaultTitle", v)} /><TextField label="Varsayılan title şablonu" value={str(draft.defaultTitleTemplate)} onChange={(v) => update("defaultTitleTemplate", v)} /><TextAreaField label="Varsayılan meta description" value={str(draft.defaultDescription)} onChange={(v) => update("defaultDescription", v)} /><TextField label="Oyun title şablonu" value={str(draft.gameTitleTemplate)} onChange={(v) => update("gameTitleTemplate", v)} /><TextField label="Kategori title şablonu" value={str(draft.categoryTitleTemplate)} onChange={(v) => update("categoryTitleTemplate", v)} /><TextAreaField label="Kategori description şablonu" value={str(draft.categoryDescriptionTemplate)} onChange={(v) => update("categoryDescriptionTemplate", v)} /></Card>
    <Card title="Google sonucu önizlemesi"><div className="rounded-md border border-border bg-background p-4"><p className="text-xs text-muted-foreground">boloyun.com › oyun › ates-ve-su</p><p className="mt-1 text-lg font-medium text-blue-400">{previewTitle}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{str(draft.defaultDescription)}</p></div><p className="text-xs text-muted-foreground">Desteklenen değişkenler: {"{{site_adı}}"}, {"{{oyun_adı}}"}, {"{{kategori_adı}}"}, {"{{sayfa}}"}</p></Card>
    <Card title="Alan adı ve görseller"><TextField label="Canonical domain" value={str(draft.canonicalDomain)} onChange={(v) => update("canonicalDomain", v)} /><AssetField label="Open Graph görseli" kind="cover" value={str(draft.openGraphImageUrl)} onChange={(v) => update("openGraphImageUrl", v)} /></Card>
    <Card title="Tarama ve indeks"><ListField label="Robots.txt engel yolları" value={strings(draft.robotsDisallow)} onChange={(v) => update("robotsDisallow", v)} /><ToggleField label="XML sitemap" checked={bool(draft.sitemapEnabled)} onChange={(v) => update("sitemapEnabled", v)} /><ToggleField label="Etiketleri sitemap’e ekle" checked={bool(draft.sitemapIncludeTags)} onChange={(v) => update("sitemapIncludeTags", v)} /><ToggleField label="Sayfaları sitemap’e ekle" checked={bool(draft.sitemapIncludeStaticPages)} onChange={(v) => update("sitemapIncludeStaticPages", v)} /><ToggleField label="Arama sonuçlarını indeksle" checked={bool(draft.searchIndexable)} onChange={(v) => update("searchIndexable", v)} /><ToggleField label="Yapılandırılmış veri" checked={bool(draft.structuredDataEnabled)} onChange={(v) => update("structuredDataEnabled", v)} /></Card>
    <Card title="Webmaster doğrulama"><TextField label="Google Search Console kodu" value={str(draft.googleVerification)} onChange={(v) => update("googleVerification", v)} /><TextField label="Bing Webmaster kodu" value={str(draft.bingVerification)} onChange={(v) => update("bingVerification", v)} /></Card>
  </div>;
}

function AdFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Global reklam davranışı"><ToggleField label="Reklamları etkinleştir" checked={bool(draft.enabled)} onChange={(v) => update("enabled", v)} /><ToggleField label="Üyelere reklam göster" checked={bool(draft.showToMembers)} onChange={(v) => update("showToMembers", v)} /><ToggleField label="Oyun açılış reklamı" checked={bool(draft.preRollEnabled)} onChange={(v) => update("preRollEnabled", v)} /><NumberField label="Reklam geçme süresi" value={num(draft.preRollSkipSeconds)} min={0} max={60} onChange={(v) => update("preRollSkipSeconds", v)} /></Card><Card title="Reklam içerikleri"><p className="text-sm text-muted-foreground">Header, ana sayfa, kategori ve oyun slotlarının kodları ayrı reklam yöneticisinde tutulur.</p><Button asChild variant="outline"><SoundLink href="/admin/ads">Reklam Yönetimi’ni Aç</SoundLink></Button><TextAreaField label="ads.txt içeriği" value={str(draft.adsTxt)} rows={8} onChange={(v) => update("adsTxt", v)} /></Card></div>;
}

function CommunityFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Üyelik"><ToggleField label="Yeni üyelikler" checked={bool(draft.registrationsEnabled)} onChange={(v) => update("registrationsEnabled", v)} /><div className="grid grid-cols-2 gap-3"><NumberField label="Minimum kullanıcı adı" value={num(draft.usernameMinLength)} min={3} max={20} onChange={(v) => update("usernameMinLength", v)} /><NumberField label="Maksimum kullanıcı adı" value={num(draft.usernameMaxLength)} min={3} max={50} onChange={(v) => update("usernameMaxLength", v)} /></div><TextField label="Kullanıcı adı deseni" value={str(draft.usernamePattern)} onChange={(v) => update("usernamePattern", v)} /><NumberField label="Minimum yaş (0 = kapalı)" value={num(draft.minimumAge)} min={0} max={18} onChange={(v) => update("minimumAge", v)} /><ToggleField label="Profil fotoğrafı" checked={bool(draft.profilePhotoEnabled)} onChange={(v) => update("profilePhotoEnabled", v)} /></Card><Card title="Yorumlar ve etkileşim"><ToggleField label="Yorum sistemi" checked={bool(draft.commentsEnabled)} onChange={(v) => update("commentsEnabled", v)} /><ToggleField label="Yorumlar ön onaya düşsün" checked={bool(draft.commentsRequireApproval)} onChange={(v) => update("commentsRequireApproval", v)} /><ListField label="Yasaklı kelimeler" value={strings(draft.blockedWords)} onChange={(v) => update("blockedWords", v)} /><NumberField label="Günlük yorum limiti" value={num(draft.dailyCommentLimit)} min={1} max={500} onChange={(v) => update("dailyCommentLimit", v)} /><ToggleField label="Oyun puanlama" checked={bool(draft.ratingsEnabled)} onChange={(v) => update("ratingsEnabled", v)} /><ToggleField label="Favoriler" checked={bool(draft.favoritesEnabled)} onChange={(v) => update("favoritesEnabled", v)} /></Card></div>;
}

function IntegrationFields({ draft, update, status }: FieldsProps & { status: SystemStatus | null }) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Analitik kimlikleri"><TextField label="Google Analytics (G-...)" value={str(draft.googleAnalyticsId)} onChange={(v) => update("googleAnalyticsId", v)} /><TextField label="Google Tag Manager (GTM-...)" value={str(draft.googleTagManagerId)} onChange={(v) => update("googleTagManagerId", v)} /><TextField label="Microsoft Clarity" value={str(draft.clarityProjectId)} onChange={(v) => update("clarityProjectId", v)} /><TextField label="Meta Pixel" value={str(draft.metaPixelId)} onChange={(v) => update("metaPixelId", v)} /><ToggleField label="Consent Mode" description="Google Analytics varsayılan olarak izin reddedilmiş durumda başlatılır; pazarlama scriptleri izin verilene kadar yüklenmez." checked={bool(draft.consentModeEnabled)} onChange={(v) => update("consentModeEnabled", v)} /></Card><div className="grid gap-3 sm:grid-cols-2"><StatusCard title="Cloudflare R2" status={status?.r2} /><StatusCard title="CDN" status={status?.cdn} /><StatusCard title="E-posta servisi (Brevo)" status={status?.email} /></div></div>;
}

function MediaFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Görsel boyutları">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Küçük görsel genişliği" value={num(draft.thumbnailWidth)} min={80} max={1200} onChange={(v) => update("thumbnailWidth", v)} />
        <NumberField label="Küçük görsel yüksekliği" value={num(draft.thumbnailHeight)} min={80} max={1200} onChange={(v) => update("thumbnailHeight", v)} />
      </div>
      <ToggleField label="Küçük görseli tam ölçüye kırp" description="Kapak kartlarının düzgün görünmesi için önerilir." checked={bool(draft.thumbnailCrop)} onChange={(v) => update("thumbnailCrop", v)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Orta görsel maksimum genişlik" value={num(draft.mediumMaxWidth)} min={120} max={2400} onChange={(v) => update("mediumMaxWidth", v)} />
        <NumberField label="Orta görsel maksimum yükseklik" value={num(draft.mediumMaxHeight)} min={120} max={2400} onChange={(v) => update("mediumMaxHeight", v)} />
        <NumberField label="Büyük görsel maksimum genişlik" value={num(draft.largeMaxWidth)} min={240} max={4000} onChange={(v) => update("largeMaxWidth", v)} />
        <NumberField label="Büyük görsel maksimum yükseklik" value={num(draft.largeMaxHeight)} min={240} max={4000} onChange={(v) => update("largeMaxHeight", v)} />
      </div>
    </Card>
    <Card title="Yükleme tercihleri">
      <ToggleField label="Yüklemeleri ay/yıl klasörlerinde düzenle" description="Örn. uploads/2026/07/..." checked={bool(draft.organizeUploadsByDate)} onChange={(v) => update("organizeUploadsByDate", v)} />
      <AssetField label="Varsayılan oyun kapak görseli" kind="cover" value={str(draft.defaultCoverUrl)} onChange={(v) => update("defaultCoverUrl", v)} />
      <p className="text-xs leading-5 text-muted-foreground">Bu bölüm görsellerle ilgili kararları tek yerde toplar. R2/CDN bağlantı durumunu Entegrasyonlar ve Sistem bölümlerinde görebilirsin.</p>
    </Card>
  </div>;
}

function PermalinkFields({ draft, update }: FieldsProps) {
  const gameBase = str(draft.gameBase) || "oyun";
  const categoryBase = str(draft.categoryBase) || "kategori";
  const tagBase = str(draft.tagBase) || "etiket";
  const pageBase = str(draft.pageBase) || "sayfa";
  const paginationBase = str(draft.paginationBase) || "sayfa";
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Public bağlantı yapısı">
      <TextField label="Oyun bağlantı tabanı" value={gameBase} onChange={(v) => update("gameBase", v)} />
      <TextField label="Kategori bağlantı tabanı" value={categoryBase} onChange={(v) => update("categoryBase", v)} />
      <TextField label="Etiket bağlantı tabanı" value={tagBase} onChange={(v) => update("tagBase", v)} />
      <TextField label="Statik sayfa bağlantı tabanı" value={pageBase} onChange={(v) => update("pageBase", v)} />
      <TextField label="Sayfalama tabanı" value={paginationBase} onChange={(v) => update("paginationBase", v)} />
      <ToggleField label="Eski bağlantıları koru/yönlendir" description="Arama motorlarında eski URL’ler varsa açık kalması önerilir." checked={bool(draft.redirectLegacyUrls)} onChange={(v) => update("redirectLegacyUrls", v)} />
    </Card>
    <Card title="Önizleme">
      <PermalinkPreview label="Oyun" href={`/${gameBase}/ates-ve-su`} />
      <PermalinkPreview label="Kategori" href={`/${categoryBase}/aksiyon-oyunlari`} />
      <PermalinkPreview label="Etiket" href={`/${tagBase}/beceri`} />
      <PermalinkPreview label="Sayfa" href={`/${pageBase}/gizlilik-politikasi`} />
      <PermalinkPreview label="Kategori sayfalama" href={`/${categoryBase}/aksiyon-oyunlari/${paginationBase}/2`} />
      <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs font-semibold leading-5 text-warning">Not: URL tabanlarını değiştirmek SEO etkisi yaratır. Değişiklikten sonra canlı linkleri ve sitemap’i kontrol etmek gerekir.</p>
    </Card>
  </div>;
}

function SecurityFields({ draft, update, status }: FieldsProps & { status: SystemStatus | null }) {
  return <div className="grid gap-3 xl:grid-cols-2"><Card title="Dosya yükleme"><NumberField label="Maksimum yükleme boyutu (MB)" value={num(draft.uploadMaxMb)} min={1} max={20} onChange={(v) => update("uploadMaxMb", v)} /><ListField label="İzin verilen MIME türleri" value={strings(draft.allowedUploadMimeTypes)} onChange={(v) => update("allowedUploadMimeTypes", v)} /></Card><Card title="Iframe domain izin listesi"><ToggleField label="İzin listesini zorunlu tut" description="Açılmadan önce mevcut oyun domainlerini aşağıdaki listeye ekleyin." checked={bool(draft.enforceIframeAllowlist)} onChange={(v) => update("enforceIframeAllowlist", v)} /><ListField label="İzin verilen domainler" value={strings(draft.iframeAllowlist)} onChange={(v) => update("iframeAllowlist", v)} />{status?.detectedIframeDomains.length ? <div><p className="text-xs font-bold">Mevcut oyunlarda algılanan domainler</p><p className="mt-1 break-words text-xs text-muted-foreground">{status.detectedIframeDomains.join(", ")}</p></div> : null}</Card></div>;
}

function AudioFields({ draft, update }: FieldsProps) {
  return <div className="grid gap-3 xl:grid-cols-2">
    <Card title="Tıklama sesi">
      <SwitchField label="Tıklama sesini etkinleştir" description="Public, auth ve admin yüzeylerinde seçilmiş link ve aksiyonlarda sesi çalar." checked={bool(draft.clickSoundEnabled)} onChange={(value) => update("clickSoundEnabled", value)} />
    </Card>
    <Card title="Ses dosyası">
      <AudioUploadField value={str(draft.clickSoundUrl)} onChange={(value) => update("clickSoundUrl", value)} />
    </Card>
  </div>;
}

function SystemFields({ status }: { status: SystemStatus | null }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"><SystemCard title="Uygulama sürümü" value={status?.appVersion ?? "-"} icon={<IconVersionsFillDuo18 className="size-4" />} /><SystemCard title="Veritabanı" value={status?.database ?? "Bağlantı yok"} icon={<IconDatabaseCheckFillDuo18 className="size-4" />} /><SystemCard title="Cloudflare R2" value={status?.r2 ?? "Yapılandırılmadı"} icon={<IconCloudUploadFillDuo18 className="size-4" />} /></div><section className="space-y-3 py-1"><div><h3 className="font-semibold">Bakım işlemleri</h3><p className="mt-2 text-sm text-muted-foreground">Ayarlar ve public oyun listeleri için kullanılan Next veri önbelleklerini geçersiz kılar.</p></div><SoundButton type="button" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { const result = await clearSettingsCacheAction(); const nextMessage = `Önbellek ${new Date(result.clearedAt).toLocaleTimeString("tr-TR")} tarihinde temizlendi.`; setMessage(nextMessage); toast.success(nextMessage); } catch (caught) { toast.error(errorMessage(caught)); } })}>{pending ? "Temizleniyor…" : "Önbelleği Temizle"}</SoundButton>{message ? <p className="text-sm font-semibold text-success">{message}</p> : null}</section></div>;
}

function HomepageSectionsEditor({ sections, setSections }: { sections: HomepageSectionInput[]; setSections: React.Dispatch<React.SetStateAction<HomepageSectionInput[]>> }) {
  function updateSection(index: number, patch: Partial<HomepageSectionInput>) { setSections((current) => current.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section)); }
  function move(index: number, direction: -1 | 1) { setSections((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, order) => ({ ...item, sortOrder: order })); }); }
  function add() { setSections((current) => [...current, { id: null, title: "Yeni Bölüm", sectionType: "latest_games", sourceType: "", sourceId: "", manualGameIds: [], limitCount: 12, sortOrder: current.length, visibility: "all", status: "active" }]); }
  return <Card title="Ana sayfa bölümleri" actions={<SoundButton type="button" size="sm" variant="outline" onClick={add}><IconAddSectionFillDuo18 className="size-4" />Bölüm Ekle</SoundButton>}><p className="text-xs text-muted-foreground">Bölümler yukarıdan aşağıya ana sayfadaki sırayı belirler. Manuel oyun kimliklerini her satıra bir UUID gelecek şekilde girin.</p>{sections.length ? <div className="space-y-3">{sections.map((section, index) => <div key={section.id ?? `new-${index}`} className="rounded-md border border-border bg-background p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold">{index + 1}. bölüm</p><div className="flex gap-1"><SoundButton type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Yukarı taşı"><ArrowUpIcon /></SoundButton><SoundButton type="button" size="icon" variant="ghost" disabled={index === sections.length - 1} onClick={() => move(index, 1)} aria-label="Aşağı taşı"><ArrowDownIcon /></SoundButton><SoundButton type="button" size="icon" variant="ghost" onClick={() => setSections((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Bölümü sil"><Trash2Icon /></SoundButton></div></div><div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><TextField label="Başlık" value={section.title} onChange={(v) => updateSection(index, { title: v })} /><SelectField label="Tür" value={section.sectionType} options={sectionTypeOptions} onChange={(v) => updateSection(index, { sectionType: v as HomepageSectionInput["sectionType"] })} /><NumberField label="Oyun sayısı" value={section.limitCount} min={1} max={60} onChange={(v) => updateSection(index, { limitCount: v })} /><SelectField label="Durum" value={section.status} options={[["active", "Aktif"], ["inactive", "Kapalı"]]} onChange={(v) => updateSection(index, { status: v as "active" | "inactive" })} /></div>{section.sectionType === "category_based" || section.sectionType === "tag_based" ? <div className="mt-3"><TextField label="Kaynak UUID" value={section.sourceId} onChange={(v) => updateSection(index, { sourceId: v, sourceType: section.sectionType === "category_based" ? "category" : "tag" })} /></div> : null}{section.sectionType === "manual_games" ? <div className="mt-3"><ListField label="Manuel oyun UUID’leri" value={section.manualGameIds} onChange={(v) => updateSection(index, { manualGameIds: v })} /></div> : null}</div>)}</div> : <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Henüz özel bölüm yok. Mevcut sabit ana sayfa düzeni fallback olarak kullanılacak.</p>}</Card>;
}

const sectionTypeOptions: Array<[string, string]> = [["latest_games", "Yeni oyunlar"], ["popular_games", "Popüler oyunlar"], ["trending_games", "Trend oyunlar"], ["manual_games", "Manuel oyunlar"], ["category_based", "Kategori bazlı"], ["tag_based", "Etiket bazlı"], ["random_picks", "Rastgele seçimler"]];

function Card({ title, children, className = "", actions }: { title: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) { return <section className={`rounded-md border border-border bg-card p-4 ${className}`}><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{actions}</div><div className="grid gap-3">{children}</div></section>; }
function PermalinkPreview({ label, href }: { label: string; href: string }) { return <div className="rounded-md border border-border bg-background p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 break-all font-mono text-sm text-foreground">https://boloyun.com{href}</p></div>; }
function StatusCard({ title, status = "Yapılandırılmadı" }: { title: string; status?: string }) { return <div className="rounded-md border border-border bg-card p-4"><p className="text-sm font-semibold">{title}</p><p className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${status === "Yapılandırıldı" || status === "Bağlı" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{status}</p></div>; }
function SystemCard({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) { return <div className="rounded-md border border-border bg-card p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-muted-foreground">{title}</p>{icon ? <span className="text-primary/80">{icon}</span> : null}</div><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) { return <label className="grid gap-1 text-sm font-bold">{label}<Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) { return <label className="grid gap-1 text-sm font-bold">{label}<Textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) { return <label className="grid gap-1 text-sm font-bold">{label}<Input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="grid gap-1 text-sm font-bold">{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></label>; }
function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) { return <AdminCheckboxField label={label} description={description} checked={checked} onCheckedChange={(value) => onChange(value === true)} />; }
function SwitchField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) { const id = useId(); return <div className="flex items-center gap-4"><Switch id={id} checked={checked} onCheckedChange={onChange} /><label htmlFor={id} className="grid gap-1 text-sm"><span className="font-bold">{label}</span>{description ? <span className="text-xs font-medium leading-5 text-muted-foreground">{description}</span> : null}</label></div>; }
function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) { return <label className="grid gap-1 text-sm font-bold">{label}<Textarea value={value.join("\n")} rows={5} onChange={(event) => onChange(event.target.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))} /></label>; }

function AudioUploadField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(value);
    audio.preload = "auto";
    const stop = () => setPlaying(false);
    audio.addEventListener("ended", stop);
    audio.addEventListener("pause", stop);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("pause", stop);
      audioRef.current = null;
      setPlaying(false);
    };
  }, [value]);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);

    try {
      const response = await fetch("/api/admin/settings/audio", { method: "POST", body });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Ses dosyası yüklenemedi.");
      onChange(result.url);
      toast.success("Ses dosyası R2’ye yüklendi.");
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function togglePreview() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      audio.currentTime = 0;
      const result = audio.play();
      if (result) await result;
      setPlaying(true);
    } catch {
      setPlaying(false);
      toast.error("Ses önizlemesi başlatılamadı.");
    }
  }

  return <div className="grid gap-3">
    <label className="grid gap-1 text-sm font-bold">
      Ses dosyası yükle
      <Input ref={inputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} />
    </label>
    <div className="flex items-center gap-2">
      <SoundButton type="button" size="icon" variant="outline" aria-label={playing ? "Önizlemeyi duraklat" : "Önizlemeyi oynat"} title={playing ? "Önizlemeyi duraklat" : "Önizlemeyi oynat"} onClick={togglePreview} disabled={!value || uploading}>
        {playing ? <IconMediaPauseFillDuo18 className="size-4" /> : <IconMediaPlayFillDuo18 className="size-4" />}
      </SoundButton>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{value || "Ses dosyası seçilmedi."}</p>
        <p className="text-xs text-muted-foreground">{uploading ? "Yükleniyor…" : "MP3, WAV, OGG veya WebM yükleyebilirsin."}</p>
      </div>
    </div>
    {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
  </div>;
}

function AssetField({ label, value, kind, onChange }: { label: string; value: string; kind: "logo" | "favicon" | "cover"; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file?: File) { if (!file) return; setUploading(true); setError(null); const body = new FormData(); body.set("file", file); body.set("kind", kind); try { const response = await fetch("/api/admin/settings/assets", { method: "POST", body }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) throw new Error(result.error || "Dosya yüklenemedi."); onChange(result.url); toast.success(`${label} R2’ye yüklendi.`); } catch (caught) { const message = errorMessage(caught); setError(message); toast.error(message); } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; } }
  return <div className="grid gap-2"><TextField label={label} value={value} onChange={onChange} /><input ref={inputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon" onChange={(event) => upload(event.target.files?.[0])} /><SoundButton type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}><IconCloudUploadFillDuo18 className="size-4" />{uploading ? "Yükleniyor…" : "R2’ye Yükle"}</SoundButton>{error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}</div>;
}

function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => { if (!isDirty) return; const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; const click = (event: MouseEvent) => { const anchor = (event.target as Element | null)?.closest("a"); if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return; if (!window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?")) { event.preventDefault(); event.stopPropagation(); } }; window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", click, true); return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); }; }, [isDirty]);
}

function countChangedKeys(left: Draft, right: Draft) { return [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key])).length; }
function sectionTitle(section: SettingsSection) { return ({ general: "Genel", appearance: "Görünüm ve Ana Sayfa", games: "Oyunlar", seo: "SEO", ads: "Reklamlar", community: "Üyelik ve Yorumlar", integrations: "Entegrasyonlar", media: "Media", permalinks: "Permalinks", security: "Güvenlik", audio: "Ses", system: "Sistem" } as const)[section]; }
function str(value: unknown) { return typeof value === "string" ? value : ""; }
function bool(value: unknown) { return value === true; }
function num(value: unknown) { return typeof value === "number" ? value : 0; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "İşlem tamamlanamadı."; }
type FieldsProps = { draft: Draft; update: (key: string, value: unknown) => void };
