# Google Analytics 4 event entegrasyonu

Bol Oyun, admin rotalarını hariç tutarak GA4 ve Google Tag Manager eventlerini aynı merkezi katmandan üretir. Eventler yalnızca çerez izni verildiğinde gönderilir. GA4 doğrudan kullanıldığında SPA geçişleri için `page_view` elle üretildiğinden otomatik sayfa görüntüleme kapalıdır.

## Event sözlüğü

| Event | Tetikleyici | Temel parametreler |
|---|---|---|
| `page_view` | İlk yükleme ve her istemci navigasyonu | `page_title`, `page_location`, `page_path` |
| `view_item` | Oyun detayının görüntülenmesi | `items` |
| `view_item_list` | Oyun bölümünün görüntülenmesi | `item_list_name`, `items` |
| `select_item` | Oyun kartı, arama önerisi, kategori veya etiket seçimi | `items` veya `content_*` |
| `search` | Arama sonuç sayfası | `search_term`, `result_count` |
| `game_start` | Oyunu Başlat akışı tamamlanıp oyuncu açıldığında | `game_type`, `items` |
| `game_loaded` | iframe/HTML5 oyuncusu yüklendiğinde | `game_type`, `items` |
| `game_load_timeout` | Oyuncu ayarlı süre içinde yüklenmediğinde | `game_type`, `timeout_seconds`, `items` |
| `game_fullscreen` | Tam ekran istendiğinde | `items` |
| `game_external_open` | Harici oyun bağlantısı açıldığında | `game_type`, `items` |
| `game_preroll_skip` | Pre-roll sonrası oyuna geçildiğinde | `items` |
| `add_to_wishlist` | Favoriye ekleme başarılı olduğunda | `items` |
| `remove_from_wishlist` | Favoriden çıkarma başarılı olduğunda | `items` |
| `game_reaction` | Beğeni tercihi başarılı olduğunda | `reaction`, `items` |
| `share` | Web Share veya bağlantı kopyalama başarılı olduğunda | `method`, `content_type`, `item_name` |
| `comment_submit` | Geçerli yorum formu gönderildiğinde | `content_type`, `content_id` |
| `random_game` | Rastgele oyun istendiğinde | `source_path` |
| `login_attempt`, `login` | Şifre/Google giriş denemesi ve başarılı dönüş | `method` |
| `sign_up_attempt`, `sign_up` | Kayıt denemesi ve başarılı/eposta doğrulama dönüşü | `method` |
| `profile_avatar_update` | Profil görseli başarıyla güncellendiğinde | `status` |
| `exception` | Uygulama hata sınırı gösterildiğinde | `description`, `fatal` |

`items` alanı GA4 e-ticaret biçimini kullanır: `item_id`, `item_name`, `item_list_name` ve `index`. Serbest metinlerde e-posta/telefon benzeri değerler gönderilmeden önce maskelenir.

## GA4 kurulumu

1. Admin > Ayarlar > Entegrasyonlar alanına `G-...` ölçüm kimliğini girin.
2. GA4 DebugView üzerinden `page_view`, `view_item`, `game_start` ve `game_loaded` zincirini kontrol edin.
3. Raporlarda kullanmak için `game_type`, `reaction`, `result_count`, `source_path` ve `timeout_seconds` parametrelerini event kapsamlı özel boyut/ölçüm olarak tanımlayın.
4. `game_start`, `add_to_wishlist`, `comment_submit`, `login` ve `sign_up` eventlerinden iş hedefi olanları GA4 içinde önemli etkinlik olarak işaretleyin.

Google Tag Manager kimliği de girildiyse eventler `dataLayer` içine nesne olarak gönderilir. Doğrudan `G-...` kimliği aktifken GTM içinde aynı GA4 eventlerini ikinci kez gönderen bir etiket tanımlamayın; aksi durumda çift sayım oluşur.
