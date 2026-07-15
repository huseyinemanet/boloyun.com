import assert from "node:assert/strict";
import test from "node:test";
import { looksMostlyEnglish, normalizeTranslatedContent, parseTranslatedContent, validateTranslatedContent } from "./quality";
import type { GameTranslationInput, TranslatedGameContent } from "./types";

const input: GameTranslationInput = {
  title: "City Car Stunt 2",
  short_description: "Drive fast cars through stunt tracks.",
  long_description: "Drive fast cars through stunt tracks and finish the route.",
  how_to_play: "Use the keyboard to drive.",
  controls: ["WASD to drive"],
  features: ["Fast cars"],
  seo_title: "City Car Stunt 2 Oyna",
  seo_description: "Play City Car Stunt 2 online.",
};

const output: TranslatedGameContent = {
  short_description: "Hızlı arabalarla gösteri parkurlarında yarış ve rotayı tamamla.",
  long_description: "City Car Stunt 2, futuristik araçlarla rampalardan geçtiğin tempolu bir sürüş oyunudur.",
  how_to_play: "Oyunu başlat, aracını seç ve klavye tuşlarıyla parkuru süre bitmeden tamamla.",
  controls: ["WASD veya yön tuşlarıyla sür", "Boşluk tuşuyla el frenini kullan"],
  features: ["İki oyunculu mod", "Gösteri parkurları", "Özelleştirilebilir arabalar"],
  seo_title: "City Car Stunt 2 Oyna",
  seo_description: "City Car Stunt 2 oyununu Türkçe açıklamalarla keşfet ve hemen oyna.",
};

test("strict JSON çeviri çıktısı parse edilir", () => {
  assert.deepEqual(parseTranslatedContent(JSON.stringify(output)), output);
});

test("başlığı değiştiren çıktı reddedilir", () => {
  assert.throws(() => validateTranslatedContent(input, { ...output, seo_title: "Araba Gösterisi Oyna" }), /oyun adını/);
});

test("kaynak kontroller boşsa güvenli fallback ile normalize edilir", () => {
  const normalized = normalizeTranslatedContent({ ...input, controls: [], features: [] }, { ...output, controls: [], features: [] });
  assert.deepEqual(normalized.controls, ["Kontroller oyun içinde gösterilir."]);
  assert.ok(normalized.features[0]?.includes("oynanış"));
});

test("kısa SEO alanları güvenli fallback ile tamamlanır", () => {
  const normalized = normalizeTranslatedContent(input, { ...output, seo_title: "Oyna", seo_description: "" });
  assert.equal(normalized.seo_title, "City Car Stunt 2 Oyna");
  assert.equal(normalized.seo_description, output.short_description);
  assert.doesNotThrow(() => validateTranslatedContent(input, normalized));
});

test("kısa oyun adlarında SEO başlığı çeviriyi engellemez", () => {
  const shortTitleInput = { ...input, title: "Red", seo_title: "Red Oyna" };
  const normalized = normalizeTranslatedContent(shortTitleInput, { ...output, seo_title: "Oyna" });
  assert.equal(normalized.seo_title, "Red Oyna");
  assert.doesNotThrow(() => validateTranslatedContent(shortTitleInput, normalized));
});

test("İngilizce ağırlıklı çıktı reddedilir", () => {
  assert.equal(looksMostlyEnglish("The game lets you play with your keyboard and collect score across levels with enemies."), true);
  assert.equal(looksMostlyEnglish("Oyunu başlat, klavye ile ilerle ve puanları topla."), false);
});
