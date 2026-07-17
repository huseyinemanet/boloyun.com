export const GAME_EXPORT_SELECT = [
  "id",
  "title",
  "slug",
  "short_description",
  "long_description",
  "how_to_play",
  "controls",
  "features",
  "developer",
  "release_date",
  "platform",
  "thumbnail_url",
  "thumbnail_source_url",
  "thumbnail_r2_key",
  "thumbnail_sync_status",
  "thumbnail_sync_error",
  "thumbnail_synced_at",
  "game_type",
  "embed_url",
  "swf_url",
  "html5_url",
  "external_url",
  "source_url",
  "source_domain",
  "status",
  "rating_avg",
  "rating_count",
  "likes_count",
  "dislikes_count",
  "play_count",
  "current_players_count",
  "seo_title",
  "seo_description",
  "primary_category_id",
  "og_image_url",
  "is_indexable",
  "is_broken",
  "created_at",
  "updated_at",
  "game_categories(categories(name,slug))",
  "game_tags(tags(name,slug))",
].join(",");

type ExportColumn = {
  header: string;
  value: (row: GameExportRow) => unknown;
};

export type GameExportRow = Record<string, unknown>;

const columns: ExportColumn[] = [
  { header: "Oyun ID", value: (row) => row.id },
  { header: "Oyunun adı", value: (row) => row.title },
  { header: "Slug", value: (row) => row.slug },
  { header: "Kısa Türkçe açıklama", value: (row) => row.short_description },
  { header: "Türkçe açıklama", value: (row) => row.long_description },
  { header: "Nasıl oynanır?", value: (row) => row.how_to_play },
  { header: "Kontroller", value: (row) => lineList(row.controls) },
  { header: "Özellikler", value: (row) => lineList(row.features) },
  { header: "Geliştirici", value: (row) => row.developer },
  { header: "Yayın tarihi", value: (row) => row.release_date },
  { header: "Platform", value: (row) => row.platform },
  { header: "Kapak URL", value: (row) => row.thumbnail_url },
  { header: "Orijinal kapak URL", value: (row) => row.thumbnail_source_url },
  { header: "Kapak depolama anahtarı", value: (row) => row.thumbnail_r2_key },
  { header: "Kapak aktarım durumu", value: (row) => row.thumbnail_sync_status },
  { header: "Kapak aktarım hatası", value: (row) => row.thumbnail_sync_error },
  { header: "Kapak aktarım tarihi", value: (row) => row.thumbnail_synced_at },
  { header: "Oyun tipi", value: (row) => row.game_type },
  { header: "Embed URL", value: (row) => row.embed_url },
  { header: "SWF URL", value: (row) => row.swf_url },
  { header: "HTML5 URL", value: (row) => row.html5_url },
  { header: "Harici URL", value: (row) => row.external_url },
  { header: "Kaynak URL", value: (row) => row.source_url },
  { header: "Kaynak domain", value: (row) => row.source_domain },
  { header: "Durum", value: (row) => row.status },
  { header: "Puan ortalaması", value: (row) => row.rating_avg },
  { header: "Puan sayısı", value: (row) => row.rating_count },
  { header: "Beğeni sayısı", value: (row) => row.likes_count },
  { header: "Beğenmeme sayısı", value: (row) => row.dislikes_count },
  { header: "Oynanma sayısı", value: (row) => row.play_count },
  { header: "Anlık oyuncu sayısı", value: (row) => row.current_players_count },
  { header: "SEO başlığı", value: (row) => row.seo_title },
  { header: "SEO açıklaması", value: (row) => row.seo_description },
  { header: "Birincil kategori ID", value: (row) => row.primary_category_id },
  { header: "Kategoriler", value: (row) => relationList(row.game_categories, "categories", "name") },
  { header: "Kategori slugları", value: (row) => relationList(row.game_categories, "categories", "slug") },
  { header: "Etiketler", value: (row) => relationList(row.game_tags, "tags", "name") },
  { header: "Etiket slugları", value: (row) => relationList(row.game_tags, "tags", "slug") },
  { header: "Open Graph görsel URL", value: (row) => row.og_image_url },
  { header: "İndekslenebilir", value: (row) => row.is_indexable },
  { header: "Oyun kırık", value: (row) => row.is_broken },
  { header: "Oluşturulma tarihi", value: (row) => row.created_at },
  { header: "Güncellenme tarihi", value: (row) => row.updated_at },
];

export function gameExportCsvHeader() {
  return `${columns.map((column) => csvCell(column.header)).join(",")}\r\n`;
}

export function gameExportCsvRow(row: GameExportRow) {
  return `${columns.map((column) => csvCell(column.value(row))).join(",")}\r\n`;
}

export function gameExportFilename(date = new Date()) {
  return `boloyun-oyunlar-${date.toISOString().slice(0, 10)}.csv`;
}

function csvCell(value: unknown) {
  const raw = scalar(value);
  const safe = /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function scalar(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return String(value);
  return JSON.stringify(value);
}

function lineList(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).join("\n");
}

function relationList(value: unknown, relation: string, key: string) {
  if (!Array.isArray(value)) return "";
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const related = item[relation];
    const records = Array.isArray(related) ? related : [related];
    return records.flatMap((record) => isRecord(record) && typeof record[key] === "string" ? [record[key]] : []);
  }).join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
