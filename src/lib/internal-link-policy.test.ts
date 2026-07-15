import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("site içi SoundLink bağlantıları native a etiketiyle tam yenileme yapmaz", async () => {
  const source = await readFile(new URL("../components/audio/sound-link.tsx", import.meta.url), "utf8");
  assert.match(source, /return <Link/);
  assert.doesNotMatch(source, /return <a[^>]*onClick=\{handleClick\}/);
});
