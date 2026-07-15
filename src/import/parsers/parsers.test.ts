import assert from "node:assert/strict";
import test from "node:test";
import { parseGenericGame } from "./generic.parser";
import { parseMiniplayGame } from "./miniplay.parser";

test("generic parser reads JSON-LD and playable iframe without a DOM dependency", () => {
  const game = parseGenericGame(`
    <html><head>
      <script type="application/ld+json">{"@type":"VideoGame","name":"Küçük &amp; Hızlı","description":"Yarış oyunu","genre":"Araba, Yarış","image":"https://cdn.example/cover.webp"}</script>
    </head><body><iframe id="game-player" data-src="https://game.example/play"></iframe></body></html>
  `, "https://source.example/game/kucuk-hizli");

  assert.equal(game.originalTitle, "Küçük & Hızlı");
  assert.equal(game.detectedEmbedUrl, "https://game.example/play");
  assert.deepEqual(game.originalCategories, ["Araba", "Yarış"]);
});

test("Miniplay parser preserves title, controls and category extraction", () => {
  const game = parseMiniplayGame(`
    <html><head>
      <title>Turbo Car free online game on Miniplay.com</title>
      <meta property="og:title" content="Turbo Car">
      <meta property="og:description" content="Hızlı yarış">
    </head><body>
      <h1>Turbo Car</h1>
      <a class="tag" href="/games/cars">Araba</a>
      <section class="game-controls"><ul><li><span class="type kb-arrows"></span><span class="action">MOVE</span></li></ul></section>
      <iframe id="game-player" data-src="https://game.example/turbo"></iframe>
    </body></html>
  `, "https://www.miniplay.com/game/turbo-car");

  assert.equal(game.originalTitle, "Turbo Car");
  assert.equal(game.originalCategories[0], "Araba");
  assert.deepEqual(game.originalControls, ["Yön tuşları: Hareket et"]);
});
