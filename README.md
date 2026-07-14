# Bol Oyun

Bol Oyun, Türkçe-first çalışan hızlı ve hafif bir mini oyun portalıdır.

Projenin ana amacı kullanıcıların oyun bulmasını, oyun sayfasına gitmesini ve **Oyunu Başlat** butonuyla tarayıcı içinde oynamasını sağlamaktır. Portal; iframe oyunları, HTML5 oyunları, SWF/Flash oyunları için Ruffle akışını, oyun keşfi/import hattını, admin onay sürecini, SEO içeriklerini, yorumları, favorileri ve reklam alanlarını destekleyecek şekilde tasarlanmıştır.

- Canlı site: [https://boloyun.com](https://boloyun.com)
- Canonical repo: [https://github.com/huseyinemanet/boloyun.com](https://github.com/huseyinemanet/boloyun.com)
- Üretim branch'i: `main`

## Nedir?

Bol Oyun bir SaaS paneli ya da sosyal ağ değil; doğrudan oyun keşfine odaklanan bir web sitesidir. Public tarafta Türkçe arayüz, kompakt oyun gridleri, kategori/etiket sayfaları, arama, rastgele oyun, oyun detay sayfası ve gecikmeli yüklenen oyun oynatıcı bulunur.

Temel kullanıcı akışı:

```txt
Oyun bul -> oyun sayfasını aç -> Oyunu Başlat -> oyna -> başka oyun keşfet
```

Admin tarafında oyun, kategori, etiket, reklam, statik sayfa, yorum ve import kuyruğu yönetilir. Import edilen oyunlar doğrudan yayına alınmaz; önce `game_imports` kuyruğuna girer, incelenir, gerekirse düzenlenir ve onaylandıktan sonra public `games` kaydına dönüşür.

## Teknoloji

Proje modern bir Next.js uygulaması olarak geliştirilmiştir.

- **Next.js 16** ve **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui** ve Radix tabanlı arayüz bileşenleri
- **Supabase Postgres** veritabanı
- **Supabase Auth** kullanıcı oturumu
- **Supabase RLS** ve admin korumaları
- **Cloudflare Workers/Pages uyumlu OpenNext** dağıtımı
- **Cloudflare R2** site varlıkları ve oyun kapakları için
- **Ruffle** destekli SWF/Flash oynatma altyapısı
- **Node.js CLI import scriptleri**
- **tsx** ile TypeScript script çalıştırma
- **Wrangler** ile Cloudflare build, preview ve deploy

## Nasıl Çalışır?

Public site `src/app/(public)` altında App Router ile çalışır. Ana sayfa oyun bölümlerini, kategori menüsünü, aramayı ve oyun kartlarını sunar. Oyun detay sayfasında önce kapak görseli ve **Oyunu Başlat** butonu gösterilir; oyun kaynağı kullanıcı tıklayana kadar yüklenmez. Bu davranış performans, güvenlik ve reklam/oyuncu deneyimi için bilinçli olarak korunur.

Admin paneli `src/app/admin` altında yer alır. Buradan oyunlar, kategoriler, etiketler, yorumlar, reklamlar, statik sayfalar, crawler/import kayıtları ve site ayarları yönetilir.

Import hattı `src/import` altında ayrılmıştır:

```txt
discover -> scrape -> parse -> generate_ai_content -> pending_review -> approve/reject -> publish
```

Bugünkü kodda sitemap keşfi, Miniplay odaklı scrape/parse akışı, import onayı ve kapak görseli/R2 yardımcıları bulunur. AI içerik komutu mevcut CLI yüzeyinde hazır durum mesajı verir; tam otomasyon bağlandığında scraped kayıtları Türkçe içerikle `pending_review` aşamasına taşıması beklenir.

Veri tarafında ana tablolar Supabase migration dosyalarıyla yönetilir. Şema değişiklikleri production üzerinde ad-hoc SQL ile yapılmamalı; `supabase/migrations` altına yeni migration eklenip repo ile birlikte pushlanmalıdır.

## Proje Yapısı

```txt
src/app                  Next.js App Router sayfaları ve route handler'lar
src/app/(public)         Public Türkçe oyun sitesi
src/app/admin            Admin paneli
src/components           Paylaşılan UI, layout, oyun, reklam ve profil bileşenleri
src/components/player    Oyun oynatıcı bileşenleri
src/import               Sitemap keşfi, scraper, parser, import ve publish scriptleri
src/lib                  Veritabanı erişimi, auth, SEO, güvenlik ve yardımcı modüller
supabase/migrations      Reprodüksiyonlu veritabanı migration dosyaları
wrangler.jsonc           Cloudflare Worker, route, R2 ve cron yapılandırması
open-next.config.ts      OpenNext Cloudflare yapılandırması
```

## Gereksinimler

- Node.js 20 veya üzeri
- pnpm `11.7.0`
- Supabase projesi
- Cloudflare hesabı
- Cloudflare R2 bucket'ı
- Gerekirse AI sağlayıcı API anahtarı

Bu repo `packageManager` alanında pnpm sürümünü sabitler. Yerel makinede pnpm yoksa komutları `npx -y pnpm@11.7.0 ...` şeklinde de çalıştırabilirsiniz.

## Kurulum

Repoyu klonlayın:

```bash
git clone https://github.com/huseyinemanet/boloyun.com.git
cd boloyun.com
```

Bağımlılıkları kurun:

```bash
npx -y pnpm@11.7.0 install
```

Ortam dosyasını hazırlayın:

```bash
cp .env.example .env.local
```

`.env.local` içinde en az şu değerleri doldurun:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=boloyun-assets
R2_PUBLIC_BASE_URL=https://cdn.boloyun.com

AI_PROVIDER=
AI_API_KEY=
AI_SETTINGS_ENCRYPTION_KEY=

SITE_URL=http://localhost:3000
ABUSE_HASH_SECRET=
```

Supabase migration'larını yerel veya bağlı Supabase projesine uygulayın. Production'a dönük değişikliklerde önce dry-run yapılmalıdır:

```bash
supabase db push --dry-run
supabase db push
supabase migration list
```

Geliştirme sunucusunu başlatın:

```bash
npx -y pnpm@11.7.0 dev
```

Yerel adres:

```txt
http://localhost:3000
```

## Kullanışlı Komutlar

Geliştirme:

```bash
npx -y pnpm@11.7.0 dev
```

Tip kontrolü:

```bash
npx -y pnpm@11.7.0 typecheck
```

Lint:

```bash
npx -y pnpm@11.7.0 lint
```

Test:

```bash
npx -y pnpm@11.7.0 test
```

Production build:

```bash
npx -y pnpm@11.7.0 build
```

Cloudflare build:

```bash
npx -y pnpm@11.7.0 cf:build
```

Cloudflare preview:

```bash
npx -y pnpm@11.7.0 cf:preview
```

Cloudflare deploy:

```bash
npx -y pnpm@11.7.0 cf:deploy
```

## Import ve Crawler Komutları

Sitemap üzerinden oyun URL'lerini keşfetme:

```bash
npx -y pnpm@11.7.0 import:discover <sitemap-url> --limit 50
```

Miniplay parser ile keşfedilen oyunları scrape etme:

```bash
npx -y pnpm@11.7.0 import:scrape --source miniplay --limit 100
```

Tekil URL scrape dry-run örneği:

```bash
npx -y pnpm@11.7.0 import:scrape --source miniplay --dry-run https://www.miniplay.com/game/example
```

AI içerik komutu:

```bash
npx -y pnpm@11.7.0 import:generate-content --limit 50
```

Onaylanmış import kayıtlarını public oyuna çevirme:

```bash
npx -y pnpm@11.7.0 import:approve --limit 10
```

Başarısız import kayıtlarını tekrar deneme:

```bash
npx -y pnpm@11.7.0 import:retry-failed
```

Kapak görseli/R2 yardımcı komutları:

```bash
npx -y pnpm@11.7.0 covers:audit
npx -y pnpm@11.7.0 covers:migrate
npx -y pnpm@11.7.0 covers:retry
npx -y pnpm@11.7.0 covers:rollback
```

SEO statik sayfa seed komutu:

```bash
npx -y pnpm@11.7.0 seo:seed-static-pages
```

## Veritabanı ve İçerik Modeli

Ana veri modeli Supabase Postgres üzerindedir. Önemli tablolar:

- `profiles`
- `games`
- `categories`
- `tags`
- `game_categories`
- `game_tags`
- `game_imports`
- `homepage_sections`
- `comments`
- `favorites`
- `ratings`
- `game_plays`
- `ad_slots`
- `ads`
- `static_pages`

Kategori ve etiket ilişkileri many-to-many tutulur. Oyun tablosunda kategori veya etiketler virgülle ayrılmış string olarak saklanmamalıdır.

## Güvenlik Notları

- Secret değerleri `.env.local` içinde kalmalı, repoya commitlenmemelidir.
- Admin route'ları korunmalıdır.
- Public tarafta import edilmiş raw HTML render edilmemelidir.
- AI çıktısı, SVG ikon girişi, reklam kodları ve iframe URL'leri güvenlik kontrollerinden geçmelidir.
- Yorumlar authentication ve moderasyon akışıyla yönetilmelidir.
- Sıradan kullanıcılar oyun, import, reklam, kategori veya etiket verisini değiştirememelidir.

## Doğrulama

Uygulama değişiklikleri için varsayılan kontrol seti:

```bash
npx -y pnpm@11.7.0 typecheck
npx -y pnpm@11.7.0 lint
npx -y pnpm@11.7.0 test
npx -y pnpm@11.7.0 build
```

Veritabanı migration değişikliklerinde ayrıca:

```bash
supabase db push --dry-run
supabase migration list
```

## Yayına Alma

Production branch `main` branch'idir.

Supabase GitHub entegrasyonu migration gibi backend artifact'lerini izler; Next.js frontend deploy'u ayrıca Cloudflare/OpenNext hattından yapılır. Bu yüzden başarılı bir Supabase deployment, sitenin Cloudflare üzerinde yayınlandığı anlamına gelmez.

Manuel Cloudflare deploy için:

```bash
npx -y pnpm@11.7.0 cf:deploy
```

Deploy sonrası canlı rota kontrol edilmelidir:

```txt
https://boloyun.com
```
