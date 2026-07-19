# Bol Oyun

Bol Oyun, Türkçe odaklı, hızlı ve hafif bir mini oyun portalıdır.

Ana hedef basit: kullanıcı oyunu bulur, oyun sayfasını açar, **Oyunu Başlat** butonuna basar ve tarayıcı içinde oynar. Proje bu akışı bozmadan oyun keşfi, kategori/etiket sayfaları, arama, favoriler, yorumlar, admin yönetimi, import kuyruğu, reklam alanları ve SEO içerikleri sunar.

- Canlı site: [https://boloyun.com](https://boloyun.com)
- Canonical repo: [https://github.com/huseyinemanet/boloyun.com](https://github.com/huseyinemanet/boloyun.com)
- Production branch: `main`

## Ürün Yaklaşımı

Bol Oyun bir SaaS paneli, sosyal ağ veya ağır oyun platformu değildir. Public taraf Türkçe-first, kompakt ve hızlı kalır.

Temel kullanıcı akışı:

```txt
Oyun bul -> oyun sayfasını aç -> Oyunu Başlat -> oyna -> başka oyun keşfet
```

Public tarafta:

- Türkçe ana sayfa, kategori sayfaları, etiket sayfaları ve arama
- Kompakt oyun kartları ve sticky kategori navigasyonu
- iframe, HTML5, SWF/Flash ve external oyun türleri
- SWF oyunlar için Ruffle desteği
- Oyuncu tıklamadan yüklenmeyen oyun oynatıcı
- Favoriler, son oynananlar, yorumlar ve puanlama
- SEO başlığı, açıklaması, canonical ve Open Graph çıktıları

Admin tarafta:

- Oyun, kategori, etiket ve statik sayfa yönetimi
- Reklam slotları ve reklam kodu yönetimi
- Import/crawler kayıtları için inceleme kuyruğu
- AI destekli Türkçe içerik üretim alanları
- Onay, ret ve düzeltme akışları
- Yorum moderasyonu

## Teknoloji

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui ve Radix tabanlı arayüz bileşenleri
- Supabase Postgres
- Supabase Auth
- Supabase RLS ve admin yetki kontrolleri
- S3 uyumlu obje depolama/CDN üzerinden kapak ve site varlıkları
- Ruffle ile SWF/Flash oyun desteği
- Node.js CLI import ve crawler scriptleri
- Docker, Docker Compose ve Nginx
- Hetzner VPS üzerinde izole production runtime
- GitHub Actions ile image build, sunucuya aktarım ve otomatik deploy

## Production Mimarisi

Production runtime Hetzner VPS üzerinde Docker container olarak çalışır. Sunucudaki Nginx, dış trafiği sadece local porta bağlı uygulama container'ına proxy'ler.

```txt
Kullanıcı
  -> https://boloyun.com
  -> Nginx
  -> 127.0.0.1:3001
  -> boloyun-app
  -> Supabase / obje deposu / harici servisler
```

Deploy akışı:

```txt
main branch'e push veya merge
  -> GitHub Actions
  -> Next.js standalone Docker image build
  -> image arşivinin VPS'ye aktarılması
  -> /usr/local/sbin/boloyun-deploy
  -> container health check
  -> başarılıysa yeni sürüm, başarısızsa rollback
```

Sunucudaki uygulama dosyaları:

```txt
/opt/boloyun/compose.yml
/opt/boloyun/.env.production
/opt/boloyun/.deploy.env
/opt/boloyun/cache
/usr/local/sbin/boloyun-deploy
```

Uygulama SMF forumundan ayrı Docker Compose projesi ve ayrı local port üzerinde çalışır.

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
deploy/compose.yml       VPS üzerindeki production Docker Compose servisi
deploy/server            Production deploy scripti ve dar sudoers kuralı
Dockerfile               Next.js standalone production image
```

## Gereksinimler

- Node.js 20 veya üzeri
- pnpm `11.7.0`
- Supabase projesi
- S3 uyumlu obje depolama/CDN alanı
- Docker ve Docker Compose kurulu Linux VPS
- Nginx reverse proxy
- İsteğe bağlı AI sağlayıcı API anahtarı

Repo `packageManager` alanında pnpm sürümünü sabitler. Yerelde pnpm yoksa komutları `npx -y pnpm@11.7.0 ...` şeklinde çalıştırabilirsiniz.

## Yerel Kurulum

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

Temel değişkenler:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER=
AI_API_KEY=
AI_SETTINGS_ENCRYPTION_KEY=
AI_TRANSLATION_CRON_SECRET=

SITE_URL=http://localhost:3000
ABUSE_HASH_SECRET=
SLOW_QUERY_MS=500
```

Obje deposu/CDN ve bot koruma ayarları için repodaki `.env.example` dosyasını esas alın. Production secret'ları README yerine sunucudaki `/opt/boloyun/.env.production` dosyasında tutulur.

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

Performans kontrolü:

```bash
npx -y pnpm@11.7.0 perf:check
```

Docker image build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --build-arg SITE_URL="https://boloyun.com" \
  --tag boloyun:local \
  .
```

Container smoke test:

```bash
docker run --rm --env-file .env.local -p 3001:3000 boloyun:local
```

## Veritabanı

Veritabanı Supabase Postgres üzerinde çalışır ve migration dosyaları `supabase/migrations` altında tutulur.

Production şema değişiklikleri için kural:

1. Yeni migration dosyası oluştur.
2. Dry-run ile doğrula.
3. Migration listesini kontrol et.
4. Kod, migration ve gerekli konfigürasyonu birlikte commit'le.
5. Push/merge sonrası remote migration durumunu doğrula.

Komutlar:

```bash
supabase db push --dry-run
supabase db push
supabase migration list
```

Ana tablolar:

```txt
profiles
games
categories
tags
game_categories
game_tags
game_imports
homepage_sections
comments
favorites
ratings
game_plays
ad_slots
ads
static_pages
```

## Import ve Crawler

Import hattı public yayını doğrudan değiştirmez. Kayıtlar önce `game_imports` tablosuna girer, admin incelemesinden geçer ve sadece onay sonrası public oyuna dönüşür.

Akış:

```txt
discover -> scrape -> parse -> generate_ai_content -> pending_review -> approve/reject -> publish
```

Sitemap üzerinden oyun URL'lerini keşfetme:

```bash
npx -y pnpm@11.7.0 import:discover <sitemap-url> --limit 50
```

Miniplay parser ile scrape:

```bash
npx -y pnpm@11.7.0 import:scrape --source miniplay --limit 100
```

Tekil URL scrape dry-run:

```bash
npx -y pnpm@11.7.0 import:scrape --source miniplay --dry-run https://www.miniplay.com/game/example
```

AI içerik üretimi:

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

Kapak/CDN yardımcı komutları:

```bash
npx -y pnpm@11.7.0 covers:audit
npx -y pnpm@11.7.0 covers:migrate
npx -y pnpm@11.7.0 covers:retry
npx -y pnpm@11.7.0 covers:rollback
```

## Oyun Oynatıcı Kuralları

Her oyun bir `game_type` değerine sahiptir:

```txt
iframe
swf
html5
external
```

Oynatıcı davranışı:

- Oyun, kullanıcı **Oyunu Başlat** demeden yüklenmez.
- Önce kapak görseli ve başlatma aksiyonu gösterilir.
- `iframe` ve `html5` oyunlar kontrollü iframe ile açılır.
- `swf` oyunlar Ruffle ile oynatılır.
- `external` oyunlarda gömme mümkün değilse dış bağlantı aksiyonu sunulur.
- Admin preview, oyun yayına alınmadan önce test etmeye izin verir.

## Admin ve Güvenlik

- Admin rotaları oturum ve yetki kontrolüyle korunur.
- Supabase RLS kuralları ordinary user ile admin işlemlerini ayırır.
- Yorum yazma için giriş gerekir.
- Yorum moderasyonu zorunludur.
- Reklam kodu sadece admin tarafından düzenlenir.
- Import edilen ham HTML public tarafta render edilmez.
- iframe URL'leri ve SVG ikon girdileri doğrulanır/sanitize edilir.
- Secret değerler repo içine commit'lenmez.

## Reklam Alanları

Reklamlar slot bazlıdır:

```tsx
<AdSlot slotKey="game_page_below_player" />
```

Başlıca slotlar:

```txt
homepage_top_banner
homepage_between_sections
sidebar_top
sidebar_middle
game_page_top
game_page_below_player
game_page_before_comments
category_page_top
search_results_top
mobile_sticky_bottom
```

Mobil sticky reklamlar oyun oynatıcı aktifken kullanıcı deneyimini bozmayacak şekilde yönetilmelidir.

## Production Deploy

Production deploy `main` branch'e push veya merge sonrası GitHub Actions ile tetiklenir.

Gerekli GitHub Actions secret'ları:

```txt
VPS_HOST
VPS_USER
VPS_SSH_PRIVATE_KEY
VPS_SSH_KNOWN_HOSTS

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Bot koruma, obje deposu/CDN, AI sağlayıcısı ve diğer runtime secret'ları sunucuda `/opt/boloyun/.env.production` içinde tutulur. GitHub Actions image'i build eder, VPS'ye yükler ve deploy scriptini çalıştırır.

`SUPABASE_SERVICE_ROLE_KEY` image katmanına yazılmaz; build sırasında yalnız BuildKit secret mount ile geçici olarak erişilir ve production runtime değeri VPS `.env.production` dosyasından okunur.

Deploy sonrası temel doğrulama:

```bash
curl -sS -I https://boloyun.com/ | grep -Ei 'HTTP/|server:|location:'
curl -sS -I https://www.boloyun.com/ | grep -Ei 'HTTP/|server:|location:'
```

Beklenen sonuç:

```txt
https://boloyun.com/      -> 200
https://www.boloyun.com/  -> https://boloyun.com yönlendirmesi
server                    -> nginx
```

## Geliştirme ve Release Kuralları

Bir değişiklik tamamlandığında:

1. Değişikliği odaklı tut.
2. Diff'i baştan sona gözden geçir.
3. Uygun kontrolleri çalıştır.
4. Secret, `.env.local`, build çıktısı veya geçici dosya commit'leme.
5. Migration gerekiyorsa yeni migration dosyasını kodla birlikte commit'le.
6. Production değişikliklerini `main` branch'e bilinçli push/merge ile ulaştır.
7. Deploy sonrası canlı route'u doğrula.

Uygulama değişikliklerinde varsayılan kontrol seti:

```bash
npx -y pnpm@11.7.0 typecheck
npx -y pnpm@11.7.0 lint
npx -y pnpm@11.7.0 test
npx -y pnpm@11.7.0 build
```

Dokümantasyon-only değişikliklerde en azından diff ve whitespace kontrolü yapılmalıdır:

```bash
git diff --check
```

## Lisans ve Sahiplik

Bu repo Bol Oyun projesinin kaynak kodudur. Yayın, deploy ve üretim erişimleri proje sahibinin kontrolündedir.
