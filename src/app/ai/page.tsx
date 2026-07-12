import type { Metadata } from "next";
import {
  IconArtificialIntelligenceFillDuo18,
  IconBrainSparkleFillDuo18,
  IconPenDrawSparkleFillDuo18,
  IconTableSparkleFillDuo18,
} from "nucleo-ui-fill-duo-18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminShell } from "@/components/admin/admin-shell";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "AI Merkezi",
};

const aiCards = [
  {
    title: "Oyun içerikleri",
    description: "İçe aktarılan oyunlar için Türkçe başlık, açıklama, nasıl oynanır ve SEO metinlerini tek merkezden yönetmek için hazırlanıyor.",
    icon: IconPenDrawSparkleFillDuo18,
  },
  {
    title: "İçerik kalite kontrolü",
    description: "AI çıktılarında eksik alan, tekrar eden metin, zayıf SEO açıklaması ve yayın öncesi düzenleme ihtiyaçlarını takip edecek alan.",
    icon: IconBrainSparkleFillDuo18,
  },
  {
    title: "Toplu üretim işleri",
    description: "Bekleyen import kayıtları için içerik üretimi, yeniden üretim ve işlem geçmişi gibi toplu görevlerin merkezi olacak.",
    icon: IconTableSparkleFillDuo18,
  },
] as const;

export default function AiCenterPage() {
  return (
    <AdminShell>
      <div className="space-y-3">
        <AdminPageHeader
          title="AI Merkezi"
          description="Oyun içerikleri, SEO metinleri ve import sonrası AI üretim akışlarını tek yerden yönet."
        />

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
              <IconArtificialIntelligenceFillDuo18 className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">AI akışları için merkez panel</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Bu bölüm Bol Oyun’un AI destekli içerik üretim operasyonları için ayrıldı. İlk etapta görünür bir merkez
                oluşturuyoruz; sonraki adımda import kuyruğu, yeniden üretim ve içerik kalite kontrolleri buraya bağlanabilir.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          {aiCards.map((card) => {
            const Icon = card.icon;

            return (
              <section key={card.title} className="rounded-md border border-border bg-card p-4">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 font-bold">{card.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.description}</p>
                <span className="mt-4 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Hazırlanıyor
                </span>
              </section>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
