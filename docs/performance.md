# BolOyun Performance Release Gate

BolOyun'un Cloudflare Free hedefi static-first, cache-first, Worker-last calismaktir.

## Her Performans PR'i Icin

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Gerekliyse `pnpm cf:build`
- Public/private cache kontrolu:
  - `/`, `/oyun/*`, `/kategori/*`, `/etiket/*`, `/sayfa/*` anonim istekte public cache'e uygun olmali.
  - `/admin/*`, `/profil`, `/api/me`, auth route'lari ve cookie'li private response'lar `private, no-store` kalmali.
  - Private route'larda `CF-Cache-Status: HIT` kabul edilmez.

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

## Cloudflare Kontrol Listesi

- Static assets: `/_next/static/*` immutable HIT almali.
- Root public assets: `/logo.svg`, `/sounds/*`, `/thumbnails/*` en az 1 gun cache'lenmeli.
- HTML Cache Rules yalniz public anonim route gruplarina uygulanmali.
- `/api/*`, `/admin/*`, auth ve hesap route'lari Cache Rules disinda kalmali.
- Cookie bulunan isteklerde HTML edge cache bypass edilmeli.
- Global purge yerine path veya tag seviyesinde invalidation tercih edilmeli.

## Cloudflare HTML Cache Rule

Cloudflare API token'i Cache Rules okuma/yazma yetkisi vermiyorsa bu kural dashboard'dan uygulanir.

Rule amaci: yalniz anonim public HTML sayfalarini edge cache'e almak.

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

- Cache eligibility: cache eligible
- Edge TTL: override origin, 300 seconds
- Browser TTL: respect origin
- Private/auth route'larda cache bypass

Canli dogrulama:

```bash
pnpm perf:baseline https://boloyun.com/ https://boloyun.com/oyun/mini-juegos-olimpicos https://boloyun.com/kategori/2-kisilik-oyunlar
```

Beklenen sonuc:

- Ilk anonim istekte `CF-Cache-Status: MISS` veya `BYPASS` olabilir.
- Tekrar anonim istekte public HTML route'lari `HIT` alabilmeli.
- `/admin/*`, `/profil`, `/api/me`, `/giris` asla `HIT` almamali.
