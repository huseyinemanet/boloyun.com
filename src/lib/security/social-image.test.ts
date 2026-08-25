import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { createConcurrencyGate, createRemoteSocialImage, SocialImageBusyError } from "./social-image";

test("geçerli remote PNG bounded pipeline ile hedef JPEG boyutuna dönüştürülür", async () => {
  const input = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ff0000" } }).png().toBuffer();
  const output = await createRemoteSocialImage("https://example.com/image.png", 1200, 630, {
    request: async () => ({
      status: 200,
      ok: true,
      finalUrl: new URL("https://example.com/image.png"),
      headers: new Headers({ "content-type": "image/png" }),
      bytes: input,
    }),
  });
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
});

test("MIME-imza uyuşmazlığı ve 16 MP üzeri görsel reddedilir", async () => {
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#000000" } }).jpeg().toBuffer();
  await assert.rejects(() => createRemoteSocialImage("https://example.com/image", 1200, 630, {
    request: async () => ({
      status: 200,
      ok: true,
      finalUrl: new URL("https://example.com/image"),
      headers: new Headers({ "content-type": "image/png" }),
      bytes: jpeg,
    }),
  }), /MIME/);

  const oversized = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "#000000" } }).png().toBuffer();
  await assert.rejects(() => createRemoteSocialImage("https://example.com/large", 1200, 630, {
    request: async () => ({
      status: 200,
      ok: true,
      finalUrl: new URL("https://example.com/large"),
      headers: new Headers({ "content-type": "image/png" }),
      bytes: oversized,
    }),
  }), /pixel|limit/i);
});

test("sosyal görsel concurrency kuyruğu aktif ve bekleyen işleri sınırlar", async () => {
  const gate = createConcurrencyGate(1, 1, 1000);
  const releaseFirst = await gate.acquire();
  const second = gate.acquire();
  await assert.rejects(() => gate.acquire(), SocialImageBusyError);
  releaseFirst();
  const releaseSecond = await second;
  releaseSecond();
});
