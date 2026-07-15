# R2 kapak ve site varlığı geçişi

Kod ve veritabanı geçişi hazırdır. R2 bu projede yalnızca kapak, logo, favicon ve ses gibi site varlıkları için obje deposu/CDN görevi görür; Next.js uygulama runtime'ı Cloudflare Worker'a bağlı değildir.

## R2 kurulumu

1. R2 Standard içinde `boloyun-assets` bucket'ını oluşturun veya mevcut bucket'ı kullanın.
2. Bucket'a `cdn.boloyun.com` custom domain'i bağlıysa koruyun; uygulama domain'i `boloyun.com` VPS'ye taşınabilir.
3. Yalnızca `boloyun-assets` için Object Read & Write yetkili bir R2 API token üretin.
4. `cdn.boloyun.com/covers/*` için uzun TTL kullanın.
5. Cloudflare Billing altında bütçe uyarısı tutun. Uyarının trafiği otomatik kesmediğini unutmayın.

## Ortam değişkenleri

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=boloyun-assets
R2_PUBLIC_BASE_URL=https://cdn.boloyun.com
```

Anahtarlar yalnızca sunucu ve CLI ortamında bulunmalıdır. `NEXT_PUBLIC_` ön eki kullanılmamalıdır.

## Kontrollü taşıma

```bash
pnpm covers:migrate --limit 100 --concurrency 8
pnpm covers:audit --limit 100 --concurrency 8
pnpm covers:migrate --limit 500 --concurrency 8
pnpm covers:retry --limit 500 --concurrency 8
pnpm covers:audit --limit 100000 --concurrency 8
```

Her başarılı kayıt önce R2'ye yüklenir, public URL üzerinden `HEAD 200` ile doğrulanır ve ancak ardından `thumbnail_url` değiştirilir. Hatalı kayıtta kaynak URL korunur.

Seçilmiş bir pilotu geri almak için:

```bash
pnpm covers:rollback --limit 100 --confirm
```

Rollback R2 objelerini silmez. Kaynak host izinlerini ancak tam audit, görsel kontrol ve en az yedi günlük gözlemden sonra kaldırın.
