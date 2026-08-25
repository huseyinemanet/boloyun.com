import sharp from "sharp";
import { inspectCover, MAX_COVER_BYTES } from "@/import/covers/cover-file";
import { safeExternalRequest } from "@/lib/security/outbound-http";

const MAX_INPUT_PIXELS = 16_000_000;
const socialImageGate = createConcurrencyGate(2, 8, 500);

export class SocialImageBusyError extends Error {
  constructor() {
    super("Sosyal görsel işleme kapasitesi dolu.");
    this.name = "SocialImageBusyError";
  }
}

type SocialImageDependencies = {
  request?: typeof safeExternalRequest;
  gate?: { acquire(): Promise<() => void> };
};

export async function createRemoteSocialImage(
  sourceUrl: string,
  width: number,
  height: number,
  dependencies: SocialImageDependencies = {},
) {
  const release = await (dependencies.gate ?? socialImageGate).acquire();
  try {
    const source = await (dependencies.request ?? safeExternalRequest)(sourceUrl, {
      method: "GET",
      timeoutMs: 10_000,
      maxResponseBytes: MAX_COVER_BYTES,
    });
    if (!source.ok) throw new Error(`Kapak görseli alınamadı (${source.status}).`);
    const inspected = inspectCover(source.bytes, source.headers.get("content-type"));
    const pipeline = sharp(source.bytes, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true,
    });
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
      throw new Error("Sosyal görsel piksel sınırını aşıyor.");
    }
    const expectedFormat = inspected.contentType === "image/jpeg" ? "jpeg" : inspected.extension;
    if ((metadata.pages ?? 1) !== 1 || metadata.format !== expectedFormat) {
      throw new Error("Sosyal görsel tek kare JPEG, PNG veya WebP olmalı.");
    }
    return await pipeline
      .resize(width, height, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();
  } finally {
    release();
  }
}

export function createConcurrencyGate(maxActive: number, maxQueued: number, waitMs: number) {
  let active = 0;
  const queue: Array<{ grant: (release: () => void) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }> = [];

  function releaseSlot() {
    const next = queue.shift();
    if (next) {
      clearTimeout(next.timer);
      next.grant(releaseOnce());
      return;
    }
    active -= 1;
  }

  function releaseOnce() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseSlot();
    };
  }

  return {
    async acquire() {
      if (active < maxActive) {
        active += 1;
        return releaseOnce();
      }
      if (queue.length >= maxQueued) throw new SocialImageBusyError();
      return await new Promise<() => void>((grant, reject) => {
        const waiter = {
          grant,
          reject,
          timer: setTimeout(() => {
            const index = queue.indexOf(waiter);
            if (index >= 0) queue.splice(index, 1);
            reject(new SocialImageBusyError());
          }, waitMs),
        };
        queue.push(waiter);
      });
    },
  };
}
