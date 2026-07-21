import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const GAME_SLUG = "miami-super-drive";
const PROFILE_USERNAME = "huseyinemanet";
const BATCH_KEY = "miami-comments-performance-seed";

const comments = [
  "Sürüş hissi gerçekten çok keyifli.",
  "Şehirde özgürce dolaşmak hoşuma gitti.",
  "Arabaların kontrolü beklediğimden daha akıcı.",
  "Biraz daha fazla araç seçeneği olsa harika olurdu.",
  "Yollar güzel ama bazı dönüşler gereğinden sert hissettiriyor.",
  "Kısa bir mola için açtım, uzun süre oynadım.",
  "Grafikler sade fakat atmosfer gayet başarılı.",
  "🚗 Şehir turu yapmak çok eğlenceli olmuş.",
  "Kontrolleri öğrenmek kolay, ustalaşmak biraz zaman alıyor.",
  "Müzik ile sürüş birbirine çok yakışmış.",
  "Başlangıçta biraz yavaş geldi ama sonra oyun açılıyor.",
  "Virajlarda araç bazen fazla kayıyor.",
  "Gece sürüşü seçeneği olsa çok güzel olur.",
  "Bu oyunun rahatlatıcı bir havası var 😊",
  "Hızlanınca şehir çok daha canlı hissettiriyor.",
  "Bazı bölgeler birbirine benziyor, çeşitlilik artırılabilir.",
  "Direksiyon tepkileri oldukça başarılı.",
  "Aracı seçip hemen yola çıkabilmek güzel.",
  "Beklediğimden daha eğlenceli çıktı.",
  "Ses efektleri biraz daha güçlü olabilirdi.",
  "Şehir tasarımındaki küçük ayrıntıları sevdim.",
  "Yarış baskısı olmadan dolaşmak ayrı bir keyif.",
  "Mobilde kontrol ederken birkaç kez zorlandım.",
  "Bilgisayarda akıcı ve rahat çalışıyor.",
  "Araba oyunlarını sevenler mutlaka denemeli.",
  "İlk virajda savruldum ama sonra alıştım 😄",
  "Harita biraz daha büyük olsaydı keşif hissi güçlenirdi.",
  "Renkler canlı, kapak görselindeki havayı oyunda da veriyor.",
  "Tekrar tekrar açılabilecek sade bir sürüş oyunu.",
  "Bazen araç çevreye takılıyor, yine de oynanışı çok bozmuyor.",
  "Hız hissi başarılı fakat kamera biraz daha yumuşak olabilir.",
  "Klavye kontrolleri anlaşılır ve hızlı tepki veriyor.",
  "Şehir içinde amaçsızca gezmek şaşırtıcı biçimde eğlenceli.",
  "Daha fazla görev eklenirse oyun çok daha uzun ömürlü olur.",
  "🚘 Aracın görünüşü ve yol detayları hoşuma gitti.",
  "Bir iki küçük takılma dışında sorunsuz oynadım.",
  "Oyun hemen açıldı ve bekletmedi, bunu sevdim.",
  "Trafik biraz daha hareketli olabilirdi.",
  "Sürüş kolay görünüyor ama keskin dönüşler dikkat istiyor.",
  "Çocuklarla birlikte denedik, kontrolleri hemen anladılar.",
  `İlk izlenimim olumlu.

Biraz daha içerik eklenirse yeniden oynamak isterim.`,
  `Şehir güzel görünüyor.
Yollar akıcı.
Kontroller de anlaşılır.`,
  "Aracı hızlandırmak eğlenceli ama fren mesafesi bana uzun geldi.",
  "🏁 Yarış modu olmasa bile sürmek oldukça keyifli.",
  "Kamera açısı bazı yerlerde görüşü zorlaştırıyor.",
  "Türkçe açıklamalar sayesinde oyuna nasıl başlayacağımı hemen anladım.",
  "Çok karmaşık olmadan eğlendiren oyunları seviyorum, bu da onlardan biri.",
  "Şehrin farklı bölgelerinde dolaşırken yeni yollar keşfetmek güzel.",
  "Bir süre sonra tekrar eden yerler fark ediliyor ama sürüş hissi oyunu taşıyor.",
  "Genel olarak başarılı, hızlı açılan ve rahatça oynanan bir araba oyunu 👏",
];

const apply = process.argv.includes("--apply");
const cleanup = process.argv.includes("--cleanup");
if (apply === cleanup) throw new Error("Tam olarak bir işlem seçin: --apply veya --cleanup");
if (comments.length !== 50) throw new Error(`Beklenen yorum sayısı elli, bulunan: ${comments.length}`);
if (comments.some((comment) => /\d/.test(comment))) throw new Error("Test yorumlarında rakam bulunamaz.");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase servis bilgileri eksik.");
if (!url.includes("yjoipnnyhpgvzukhrljp")) throw new Error("Beklenmeyen Supabase projesi; işlem durduruldu.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const [{ data: game, error: gameError }, { data: profile, error: profileError }] = await Promise.all([
  supabase.from("games").select("id, slug, status").eq("slug", GAME_SLUG).eq("status", "published").single(),
  supabase.from("profiles").select("id, username, status").eq("username", PROFILE_USERNAME).eq("status", "active").single(),
]);
if (gameError || !game) throw new Error(`Oyun bulunamadı: ${gameError?.message ?? "bilinmeyen hata"}`);
if (profileError || !profile) throw new Error(`Profil bulunamadı: ${profileError?.message ?? "bilinmeyen hata"}`);

const ids = comments.map((_, index) => deterministicUuid(`${BATCH_KEY}:${index}`));
if (cleanup) {
  const { error } = await supabase.from("comments").delete().in("id", ids);
  if (error) throw new Error(`Test yorumları silinemedi: ${error.message}`);
  console.log(JSON.stringify({ action: "cleanup", game: GAME_SLUG, removedIds: ids.length }));
  process.exit(0);
}

const now = Date.now();
const rows = comments.map((body, index) => {
  const timestamp = new Date(now - index * 17 * 60 * 1000).toISOString();
  return {
    id: ids[index],
    game_id: game.id,
    user_id: profile.id,
    body,
    status: "approved",
    likes_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
});

const { error: insertError } = await supabase.from("comments").upsert(rows, { onConflict: "id" });
if (insertError) throw new Error(`Test yorumları eklenemedi: ${insertError.message}`);

const { count, error: countError } = await supabase
  .from("comments")
  .select("id", { count: "exact", head: true })
  .eq("game_id", game.id)
  .eq("status", "approved");
if (countError) throw new Error(`Yorum sayısı doğrulanamadı: ${countError.message}`);
console.log(JSON.stringify({ action: "apply", game: GAME_SLUG, seeded: rows.length, approvedCommentsForGame: count }));

function deterministicUuid(value) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}
