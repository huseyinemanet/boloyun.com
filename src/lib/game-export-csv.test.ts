import assert from "node:assert/strict";
import test from "node:test";
import { gameExportCsvHeader, gameExportCsvRow, gameExportFilename } from "@/lib/game-export-csv";

test("oyun exportu önemli alanları ve satır içi listeleri CSV'ye yazar", () => {
  const header = gameExportCsvHeader();
  const row = gameExportCsvRow({
    id: "game-1",
    title: 'Araba "Yarışı"',
    long_description: "İlk satır\nİkinci satır",
    how_to_play: "Bitişe ulaş.",
    controls: ["Yön tuşları", "Boşluk tuşu"],
    features: ["Tek oyunculu", "Hızlı yarış"],
    embed_url: "https://games.example/embed/1",
    game_categories: [{ categories: { name: "Yarış", slug: "yaris" } }],
    game_tags: [{ tags: { name: "Araba", slug: "araba" } }],
  });

  assert.match(header, /"Oyunun adı"/);
  assert.match(header, /"Türkçe açıklama"/);
  assert.match(header, /"Nasıl oynanır\?"/);
  assert.match(header, /"Kontroller"/);
  assert.match(header, /"Özellikler"/);
  assert.match(header, /"Embed URL"/);
  assert.match(row, /"Araba ""Yarışı"""/);
  assert.match(row, /"İlk satır\nİkinci satır"/);
  assert.match(row, /"Yön tuşları\nBoşluk tuşu"/);
  assert.match(row, /"Tek oyunculu\nHızlı yarış"/);
  assert.match(row, /"Yarış"/);
  assert.match(row, /"Araba"/);
});

test("CSV hücreleri formül çalıştırılmasına karşı güvenlidir", () => {
  assert.match(gameExportCsvRow({ title: "=HYPERLINK(\"https://example.com\")" }), /"'=HYPERLINK\(""https:\/\/example\.com""\)"/);
});

test("export dosya adı ISO tarihini kullanır", () => {
  assert.equal(gameExportFilename(new Date("2026-07-17T12:00:00.000Z")), "boloyun-oyunlar-2026-07-17.csv");
});
