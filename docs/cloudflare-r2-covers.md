# Cloudflare R2 kapak geçişi

Kod ve veritabanı geçişi hazırdır. Üretim taşıması aşağıdaki dış hesap adımları tamamlanmadan başlatılmamalıdır.

## Cloudflare kurulumu

1. `boloyun.com` alan adını Cloudflare Free hesabına ekleyin.
2. Namecheap'teki tüm A, AAAA, CNAME, MX ve TXT kayıtlarını karşılaştırın. SPF, DKIM ve DMARC kayıtları eksiksiz görünmeden nameserver değiştirmeyin.
3. Cloudflare'ın verdiği iki nameserver'ı Namecheap'te kaydedin ve bölgenin `Active` olmasını bekleyin.
4. R2 Standard içinde `boloyun-assets` bucket'ını oluşturun.
5. Bucket'a `cdn.boloyun.com` custom domain'ini bağlayın; üretimde `r2.dev` erişimini kapatın.
6. Yalnızca `boloyun-assets` için Object Read & Write yetkili bir R2 API token üretin.
7. `cdn.boloyun.com/covers/*` için Cache Everything, Browser TTL ve Edge TTL değerlerini bir yıl yapın. Smart Tiered Cache'i etkinleştirin.
8. Cloudflare Billing altında 1 USD bütçe uyarısı oluşturun. Uyarının trafiği otomatik kesmediğini unutmayın.

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

Her başarılı kayıt önce R2'ye yüklenir, CDN üzerinden `HEAD 200` ile doğrulanır ve ancak ardından `thumbnail_url` değiştirilir. Hatalı kayıtta kaynak URL korunur.

Seçilmiş bir pilotu geri almak için:

```bash
pnpm covers:rollback --limit 100 --confirm
```

Rollback R2 objelerini silmez. Kaynak host izinlerini ancak tam audit, görsel kontrol ve en az yedi günlük gözlemden sonra kaldırın.
