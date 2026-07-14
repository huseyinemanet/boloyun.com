import { headers } from "next/headers";

export async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");

  if (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")) {
    return `http://${host}`;
  }

  if (host === "boloyun.com" || host === "www.boloyun.com") {
    return `https://${host}`;
  }

  if (origin) return origin;

  const proto = headerStore.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return process.env.SITE_URL || "http://localhost:3000";
}
