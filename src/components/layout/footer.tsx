import { IntentPrefetchLink } from "@/components/navigation/intent-prefetch-link";

const links = [
  ["Kullanım Şartları", "kullanim-sartlari"],
  ["Gizlilik Politikası", "gizlilik-politikasi"],
  ["Çerez Politikası", "cerez-politikasi"],
  ["DMCA / Telif", "telif-hakki"],
  ["İletişim", "iletisim"],
  ["Hakkımızda", "hakkimizda"],
  ["Reklam", "reklam"],
];

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-card">
      <div className="mx-auto flex flex-wrap gap-3 px-4 py-6 text-sm text-muted-foreground">
        {links.map(([label, slug]) => (
          <IntentPrefetchLink key={slug} href={`/sayfa/${slug}`} className="hover:text-primary">
            {label}
          </IntentPrefetchLink>
        ))}
      </div>
    </footer>
  );
}
