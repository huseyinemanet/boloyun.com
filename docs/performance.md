# BolOyun Performance Release Gate

BolOyun'un production hedefi Hetzner VPS uzerinde hafif, cache-first ve uygulama CPU'sunu koruyan bir Next.js standalone servisidir.

## Her Performans PR'i Icin

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Gerekliyse production Docker image build'i
- Public/private cache kontrolu:
  - `/`, `/oyun/*`, `/kategori/*`, `/etiket/*`, `/sayfa/*` anonim istekte public cache'e uygun olmali.
  - `/admin/*`, `/profil`, `/api/me`, auth route'lari ve cookie'li private response'lar `private, no-store` kalmali.
  - Private route'larda paylasimli HTML cache kabul edilmez.

## Baseline Komutu

```bash
pnpm perf:baseline
```

Komut varsayilan kritik route'lar icin status, byte, TTFB, total time, `Cache-Control` ve `CF-Cache-Status` degerlerini JSON satirlari olarak yazar.

Ozel route listesi:

```bash
pnpm perf:baseline https://boloyun.com/ https://boloyun.com/oyun/mini-juegos-olimpicos
```

## Bundle Raporu

Build sonrasinda route bazli client JS/CSS raporu:

```bash
pnpm build
pnpm perf:bundle
```

Tek route kontrolu:

```bash
pnpm perf:bundle '/(public)/page' '/(public)/oyun/[slug]/page'
```

Rapor JSON satirlari uretir:

- `jsBytes`: route icin istemci JS dosya toplamı
- `cssBytes`: route icin CSS dosya toplamı
- `clientModuleCount`: hydrate edilen client module sayisi
- `largestClientModules`: once incelenecek proje client module'leri

Public route'larda yeni ozellik eklenince `jsBytes`, `cssBytes` ve `clientModuleCount` kontrolsuz artmamalidir.

## VPS / Nginx Kontrol Listesi

- Static assets: `/_next/static/*` immutable cache header'i almali.
- Root public assets: `/logo.svg`, `/sounds/*`, `/thumbnails/*` en az 1 gun cache'lenmeli.
- Public HTML icin Nginx cache eklenecekse yalniz anonim public route gruplarina uygulanmali.
- `/api/*`, `/admin/*`, auth ve hesap route'lari paylasimli HTML cache disinda kalmali.
- Cookie bulunan isteklerde HTML cache bypass edilmeli.
- Global purge yerine path veya cache key seviyesinde invalidation tercih edilmeli.

## Opsiyonel Nginx HTML Cache

Ilk VPS tasimasinda HTML cache'i zorunlu degildir; once dogru ve izole calisan container, sonra kontrollu cache eklemek daha sagliklidir.

Cache amaci: yalniz anonim public HTML sayfalarini kisa sureli cache'e almak.

Include:

- `/`
- `/oyun/*`
- `/kategori/*`
- `/etiket/*`
- `/sayfa/*`

Exclude:

- `/api/*`
- `/admin/*`
- `/auth/*`
- `/giris`
- `/kayit`
- `/profil`
- `/arama`
- Cookie bulunan oturumlu istekler

Onerilen ayarlar:

- Cache TTL: 300 seconds
- Browser TTL: respect origin
- Private/auth route'larda cache bypass

Canli dogrulama:

```bash
pnpm perf:baseline https://boloyun.com/ https://boloyun.com/oyun/mini-juegos-olimpicos https://boloyun.com/kategori/2-kisilik-oyunlar
```

Beklenen sonuc:

- Ilk anonim istekte origin yanit verebilir.
- Cache aciksa tekrar anonim istekte public HTML route'lari cache'ten gelebilmeli.
- `/admin/*`, `/profil`, `/api/me`, `/giris` asla paylasimli cache'ten gelmemeli.
