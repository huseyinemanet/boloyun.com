import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export async function uploadCoverObject(input: { key: string; bytes: Uint8Array; contentType: string }) {
  const config = getConfig();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.bytes,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }), { abortSignal: AbortSignal.timeout(15_000) });
    return `${config.publicBaseUrl}/${input.key}`;
  } finally {
    client.destroy();
  }
}

export async function deleteCoverObject(key: string) {
  if (!key.startsWith("covers/sha256/")) throw new Error("Geçersiz kapak anahtarı.");
  const config = getConfig();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(15_000) });
  } finally {
    client.destroy();
  }
}

export function assertCoverR2Configured() {
  getConfig();
}

function getConfig() {
  return {
    accountId: required("R2_ACCOUNT_ID"),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    bucket: required("R2_BUCKET_NAME"),
    publicBaseUrl: required("R2_PUBLIC_BASE_URL").replace(/\/$/, ""),
  };
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} eksik.`);
  return value;
}
