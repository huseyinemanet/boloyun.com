import type { Category, Game, HomepageSection } from "@/types/game";

export const categories: Category[] = [
  { id: "new", name: "Yeni Oyunlar", slug: "yeni-oyunlar", icon: "N", description: "En son eklenen mini oyunlar." },
  { id: "trend", name: "Trend Oyunlar", slug: "trend-oyunlar", icon: "T", description: "Bugün en çok ilgi gören oyunlar." },
  { id: "popular", name: "Popüler Oyunlar", slug: "populer-oyunlar", icon: "P", description: "Oyuncuların en çok tercih ettiği oyunlar." },
  { id: "action", name: "Aksiyon Oyunları", slug: "aksiyon-oyunlari", icon: "A", description: "Hızlı refleks ve heyecan isteyen oyunlar." },
  { id: "car", name: "Araba Oyunları", slug: "araba-oyunlari", icon: "AR", description: "Araba sürme, park etme ve yarış oyunları." },
  { id: "football", name: "Futbol Oyunları", slug: "futbol-oyunlari", icon: "F", description: "Gol atma, penaltı ve takım oyunları." },
  { id: "zombie", name: "Zombi Oyunları", slug: "zombi-oyunlari", icon: "Z", description: "Zombi dalgalarına karşı hayatta kal." },
  { id: "puzzle", name: "Bulmaca Oyunları", slug: "bulmaca-oyunlari", icon: "B", description: "Düşün, eşleştir ve çöz." },
  { id: "flash", name: "Flash Oyunlar", slug: "flash-oyunlar", icon: "SWF", description: "Ruffle ile çalışan klasik Flash oyunları." },
];

export const games: Game[] = [
  {
    id: "1",
    title: "Uzay Savunması",
    slug: "uzay-savunmasi",
    shortDescription: "Meteor dalgalarına karşı gemini savun ve puan topla.",
    longDescription:
      "Uzay Savunması, kısa sürede başlayıp hızlı reflekslerle oynayabileceğin tempolu bir mini oyundur. Gelen meteorleri takip et, gemini doğru noktaya konumlandır ve bölümleri geçmeye çalış.",
    howToPlay: "Oyunu başlattıktan sonra gemiyi hareket ettir, gelen engellerden kaç ve hedefleri vur.",
    controls: ["Yön tuşları ile hareket et", "Boşluk tuşu ile ateş et"],
    features: ["Hızlı başlangıç", "Kısa oyun turları", "Skor odaklı oynanış"],
    developer: "",
    thumbnailUrl: "/thumbnails/space.svg",
    gameType: "iframe",
    embedUrl: "https://example.com",
    status: "published",
    ratingAvg: 4.6,
    ratingCount: 128,
    likesCount: 104,
    dislikesCount: 12,
    playCount: 12450,
    categories: ["aksiyon-oyunlari", "trend-oyunlar"],
    tags: ["uzay", "refleks", "ateş"],
    seoTitle: "Uzay Savunması Oyna",
    seoDescription: "Uzay Savunması oyununu Türkçe açıklamalarla hemen başlat ve oyna.",
    isIndexable: true,
    isBroken: false,
  },
  {
    id: "2",
    title: "Şehir Yarışı",
    slug: "sehir-yarisi",
    shortDescription: "Dar sokaklarda rakiplerini geç ve bitiş çizgisine ulaş.",
    longDescription:
      "Şehir Yarışı kompakt pistlerde hızlı karar vermeyi seven oyuncular için hazırlandı. Virajlarda dikkatli ol, hızını koru ve rakiplerini geride bırak.",
    howToPlay: "Arabanı kontrol et, virajlarda hızını ayarla ve rakiplerden önce bitişe ulaş.",
    controls: ["Yön tuşları ile sür", "Shift ile hızlan"],
    features: ["Araba yarışı", "Kolay kontroller", "Hızlı tekrar oynanabilirlik"],
    thumbnailUrl: "/thumbnails/race.svg",
    gameType: "html5",
    html5Url: "https://example.com",
    status: "published",
    ratingAvg: 4.3,
    ratingCount: 94,
    likesCount: 78,
    dislikesCount: 9,
    playCount: 9820,
    categories: ["araba-oyunlari", "populer-oyunlar"],
    tags: ["araba", "yarış", "hız"],
    seoTitle: "Şehir Yarışı Oyna",
    seoDescription: "Şehir Yarışı ile hızlı bir araba oyununa başla.",
    isIndexable: true,
    isBroken: false,
  },
  {
    id: "3",
    title: "Penaltı Ustası",
    slug: "penalti-ustasi",
    shortDescription: "Kaleciyi şaşırt, doğru köşeyi seç ve golü at.",
    longDescription:
      "Penaltı Ustası, futbol oyunlarını sevenler için sade ve eğlenceli bir penaltı deneyimi sunar. Açıyı ve gücü iyi ayarlayarak kaleciyi geçmeye çalış.",
    howToPlay: "Vuruş yönünü seç, gücü ayarla ve topu kaleye gönder.",
    controls: ["Fare ile hedef seç", "Tıklayarak şut çek"],
    features: ["Futbol teması", "Tek tıkla oynanış", "Kısa turlar"],
    thumbnailUrl: "/thumbnails/football.svg",
    gameType: "iframe",
    embedUrl: "https://example.com",
    status: "published",
    ratingAvg: 4.5,
    ratingCount: 76,
    likesCount: 66,
    dislikesCount: 7,
    playCount: 7140,
    categories: ["futbol-oyunlari", "populer-oyunlar"],
    tags: ["futbol", "penalti", "spor"],
    seoTitle: "Penaltı Ustası Oyna",
    seoDescription: "Penaltı Ustası oyununda kaleciyi geç ve gol at.",
    isIndexable: true,
    isBroken: false,
  },
  {
    id: "4",
    title: "Klasik Top Patlatma",
    slug: "klasik-top-patlatma",
    shortDescription: "Aynı renkteki topları eşleştir ve alanı temizle.",
    longDescription:
      "Klasik Top Patlatma, sakin ama bağımlılık yapan bulmaca oyunlarını sevenler için güzel bir seçimdir. Renkleri takip et ve hamlelerini dikkatli kullan.",
    howToPlay: "Aynı renkteki topları hedefle, üçlü gruplar oluştur ve puan kazan.",
    controls: ["Fare ile hedef al", "Tıklayarak top fırlat"],
    features: ["Bulmaca oynanışı", "Renk eşleştirme", "Klasik mini oyun hissi"],
    thumbnailUrl: "/thumbnails/puzzle.svg",
    gameType: "swf",
    swfUrl: "https://example.com/game.swf",
    status: "published",
    ratingAvg: 4.2,
    ratingCount: 53,
    likesCount: 44,
    dislikesCount: 6,
    playCount: 5530,
    categories: ["bulmaca-oyunlari", "flash-oyunlar"],
    tags: ["bulmaca", "klasik", "flash"],
    seoTitle: "Klasik Top Patlatma Oyna",
    seoDescription: "Klasik Top Patlatma oyununu Ruffle desteğiyle başlat.",
    isIndexable: true,
    isBroken: false,
  },
];

export const homepageSections: HomepageSection[] = [
  { id: "latest", title: "Yeni Oyunlar", sectionType: "latest_games", gameSlugs: ["uzay-savunmasi", "sehir-yarisi", "penalti-ustasi", "klasik-top-patlatma"], visibility: "all" },
  { id: "popular", title: "Popüler Oyunlar", sectionType: "popular_games", gameSlugs: ["sehir-yarisi", "penalti-ustasi", "uzay-savunmasi"], visibility: "all" },
  { id: "flash", title: "Klasik Flash Oyunlar", sectionType: "category_based", gameSlugs: ["klasik-top-patlatma"], visibility: "all" },
];

export function getGameBySlug(slug: string) {
  return games.find((game) => game.slug === slug && game.status === "published");
}

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getGamesByCategory(slug: string) {
  return games.filter((game) => game.status === "published" && game.categories.includes(slug));
}

export function searchGames(query: string) {
  const normalized = query.trim().toLocaleLowerCase("tr");
  if (!normalized) {
    return [];
  }

  return games.filter((game) => {
    const haystack = [game.title, game.shortDescription, ...game.tags, ...game.categories].join(" ").toLocaleLowerCase("tr");
    return haystack.includes(normalized);
  });
}
