import assert from "node:assert/strict";
import test from "node:test";
import { translateGameContent } from "./providers";
import type { AiRuntimeConfig, GameTranslationInput, TranslatedGameContent } from "./types";

const config: AiRuntimeConfig = {
  provider: "deepseek",
  model: "deepseek-v4-flash",
  apiKey: "test-key",
};

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
  long_description: "City Car Stunt 2, rampalardan geçtiğin tempolu bir sürüş oyunudur.",
  how_to_play: "Oyunu başlat, aracını seç ve klavye tuşlarıyla parkuru tamamla.",
  controls: ["WASD veya yön tuşlarıyla sür"],
  features: ["Gösteri parkurları"],
  seo_title: "City Car Stunt 2 Oyna",
  seo_description: "City Car Stunt 2 oyununu keşfet ve hemen oyna.",
};

test("çeviri isteği JSON için güvenli çıktı bütçesi ve uzunluk talimatları kullanır", async (t) => {
  let requestBody: Record<string, unknown> | undefined;
  t.mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }],
    });
  });

  await translateGameContent(input, config);

  assert.equal(requestBody?.max_tokens, 4_096);
  assert.match(JSON.stringify(requestBody?.messages), /long_description 1800/);
});

test("token sınırında kesilen JSON parse edilmeden anlaşılır hataya çevrilir", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    choices: [{
      finish_reason: "length",
      message: { content: '{"short_description":"Yarım kalan' },
    }],
  }));

  await assert.rejects(
    translateGameContent(input, config),
    /JSON çıktısını token sınırında yarıda kesti/,
  );
});
