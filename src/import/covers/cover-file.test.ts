import assert from "node:assert/strict";
import test from "node:test";
import { inspectCover, MAX_COVER_BYTES } from "./cover-file";

test("JPEG kapağı içerik hash'inden kararlı bir R2 anahtarına dönüştürür", () => {
  const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
  const first = inspectCover(bytes, "image/jpeg; charset=binary");
  const second = inspectCover(bytes, "image/jpeg");
  assert.equal(first.key, second.key);
  assert.match(first.key, /^covers\/sha256\/[a-f0-9]{2}\/[a-f0-9]{64}\.jpg$/);
  assert.equal(first.contentType, "image/jpeg");
  assert.equal(first.byteSize, bytes.length);
});

test("HTML yanıtını görsel olarak kabul etmez", () => {
  const html = new TextEncoder().encode("<!doctype html><title>not found</title>");
  assert.throws(() => inspectCover(html, "text/html"), /JPEG, PNG veya WebP/);
});

test("bildirilen MIME ile dosya imzası çakışırsa reddeder", () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  assert.throws(() => inspectCover(png, "image/jpeg"), /MIME türü/);
});

test("Content-Type başlığı olmayan yanıtı reddeder", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  assert.throws(() => inspectCover(jpeg, null), /Content-Type/);
});

test("5 MB üzerindeki dosyayı reddeder", () => {
  const oversized = new Uint8Array(MAX_COVER_BYTES + 1);
  oversized.set([0xff, 0xd8, 0xff]);
  assert.throws(() => inspectCover(oversized, "image/jpeg"), /5 MB/);
});
