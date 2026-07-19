import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function findAdminPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findAdminPages(absolutePath);
    return entry.name === "page.tsx" ? [absolutePath] : [];
  });
}

test("her admin sayfası veri çalıştırmadan önce doğrudan requireAdmin çağırır", () => {
  const adminRoot = path.join(process.cwd(), "src/app/admin");
  const pages = findAdminPages(adminRoot).filter((file) => !file.endsWith("/admin/login/page.tsx"));

  assert.ok(pages.length > 0, "Admin sayfası bulunamadı.");
  for (const file of pages) {
    const source = readFileSync(file, "utf8");
    const relativePath = path.relative(process.cwd(), file);
    assert.match(source, /export const dynamic = ["']force-dynamic["'];/, `${relativePath}: admin sayfası request-time render edilmeli.`);
    assert.match(source, /import\s+\{\s*requireAdmin\s*\}\s+from\s+["']@\/lib\/auth["'];/, `${relativePath}: requireAdmin import edilmeli.`);
    assert.match(
      source,
      /export default async function[\s\S]*?\)\s*\{\s*await requireAdmin\(\);/,
      `${relativePath}: default sayfa fonksiyonunun ilk işlemi await requireAdmin() olmalı.`,
    );
  }
});

test("Supabase proxy src tabanlı Next.js uygulamasının doğru giriş noktasındadır", () => {
  const proxyPath = path.join(process.cwd(), "src/proxy.ts");
  const source = readFileSync(proxyPath, "utf8");

  assert.match(source, /export async function proxy\(/);
  assert.match(source, /matcher:\s*\[[\s\S]*?"\/admin\/:path\*"[\s\S]*?"\/profil\/:path\*"[\s\S]*?\]/);
});
