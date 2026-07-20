# Arka Plan Worker Mimarisi

Bol Oyun public web trafiği ile crawler/AI işlerini iki ayrı Docker servisine ayırır:

```txt
boloyun-app
  -> Nginx üzerinden public trafik
  -> BOL_OYUN_PROCESS_ROLE=web
  -> background worker kapalı

boloyun-worker
  -> dışarı port açmaz
  -> BOL_OYUN_PROCESS_ROLE=worker
  -> crawler ve AI işlerini küçük partilerle işler
```

İki servis aynı Docker image'ını kullanır. Worker ilk aşamada aynı VPS'te çalışır ancak ayrı CPU, bellek, health check ve restart sınırına sahiptir.

## Kalıcı crawler kuyruğu

Admin panelindeki crawler isteği artık uzun bir HTTP bağlantısı içinde scrape ve AI çağrıları yapmaz.

1. `POST /admin/crawler/run` doğrulanmış bir `crawler_jobs` kaydı oluşturur ve `202` döndürür.
2. Worker işi `claim_crawler_job` RPC'siyle atomik olarak alır.
3. Sitemap keşfi tamamlanınca işlenecek en fazla 500 import hedefi job kaydında saklanır.
4. Worker hedefleri varsayılan olarak ikişerli partilerle işler.
5. Admin ekranı job durumunu iki saniyede bir okur. Tarayıcı kapansa da iş devam eder.
6. Worker kapanırsa kilit beş dakika sonra stale sayılır ve iş kaldığı noktadan tekrar alınır.

## Gerekli production ayarı

`/opt/boloyun/.env.production` içine en az 32 rastgele byte'tan üretilmiş bir token ekleyin:

```bash
openssl rand -hex 32
```

```env
INTERNAL_HEALTH_CHECK_TOKEN=üretilen_değer
```

Bu değer public health/readiness erişimini kapatır ve Docker ile deploy scriptinin dahili kontrollerinde kullanılır.

İsteğe bağlı worker ayarları:

```env
BACKGROUND_WORKER_ACTIVE_INTERVAL_MS=2000
BACKGROUND_WORKER_IDLE_INTERVAL_MS=15000
BACKGROUND_WORKER_CRAWLER_BATCH_SIZE=2
BACKGROUND_WORKER_AI_LIMIT=5
```

## İlk production geçişi

Production Compose ve deploy scripti repo dışında yaşadığı için bu mimariye geçerken deploy yardımcısı bir kez root yetkisiyle hazırlanmalıdır. Mevcut Compose dosyası ilk aday başarıyla doğrulanmadan değiştirilmez; böylece başarısız aday eski tek-servis düzenine dönebilir.

Sıra önemlidir:

1. `20260720200000_crawler_worker_queue.sql` migration'ını dry-run ile doğrulayın ve Supabase'e uygulayın.
2. `INTERNAL_HEALTH_CHECK_TOKEN` değerini production env dosyasına ekleyin.
3. Repodaki `deploy/server/boloyun-deploy` dosyasını `/usr/local/sbin/boloyun-deploy` konumuna executable olarak kurun.
4. Mevcut `/opt/boloyun/compose.yml` dosyasını yerinde bırakın.
5. Sonraki `main` deploy'unu çalıştırın. Aday app ve worker healthy olursa deploy scripti sürümlü `deploy/compose.yml` dosyasını atomik olarak kurar.
6. İki container'ın da healthy olduğunu doğrulayın.

İlk geçişten sonra GitHub Actions her image ile sürümlü Compose ve deploy scriptini de VPS&apos;ye gönderir. Deploy scripti aday iki servisi başlatır; app ve worker sağlık kontrolleri geçerse yeni runtime dosyalarını kalıcı konumlarına atomik olarak kurar. Başarısız adayda önceki image ve Compose düzenine geri döner.

## Doğrulama

VPS üzerinde:

```bash
docker inspect --format '{{.State.Health.Status}}' boloyun-app
docker inspect --format '{{.State.Health.Status}}' boloyun-worker
docker stats --no-stream boloyun-app boloyun-worker
docker logs --tail 100 boloyun-worker
```

Admin panelinden küçük bir iş başlatın:

```txt
Keşif limiti: 10
İşleme limiti: 2
```

Sayfayı kapatıp yeniden açtığınızda aynı job ilerlemesinin görünmesi ve tamamlanan oyunların `pending_review` kuyruğuna gelmesi beklenir.
