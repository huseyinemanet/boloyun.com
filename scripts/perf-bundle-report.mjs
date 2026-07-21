import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const buildDir = ".next";
const staticDir = join(buildDir, "static");
const appServerDir = join(buildDir, "server", "app");

if (!existsSync(appServerDir)) {
  console.error("Build manifest bulunamadi. Once `pnpm build` calistirin.");
  process.exit(1);
}

const checkBudgets = process.argv.includes("--check");
const requestedRoutes = new Set(process.argv.slice(2).filter((argument) => argument !== "--check"));
const reports = [];
const publicRoutePattern = /^\/(?:$|kategori(?:\/|$)|etiket(?:\/|$)|oyun(?:\/|$)|arama(?:\/|$)|kategoriler(?:\/|$)|sayfa(?:\/|$))/;
const transferBudgetBytes = 200 * 1024;

for (const manifestPath of findFiles(appServerDir, "_client-reference-manifest.js")) {
  const manifest = readClientReferenceManifest(manifestPath);
  if (!manifest) continue;

  for (const [route, data] of Object.entries(manifest)) {
    if (requestedRoutes.size && !requestedRoutes.has(route)) continue;

    const jsFiles = uniqueFiles(Object.values(data.entryJSFiles ?? {}).flat());
    const cssFiles = uniqueFiles(Object.values(data.entryCSSFiles ?? {}).flatMap((items) => items.map((item) => item.path)));
    const clientModules = Object.keys(data.clientModules ?? {});

    reports.push({
      route,
      jsBytes: sumStaticFiles(jsFiles),
      cssBytes: sumStaticFiles(cssFiles),
      jsGzipBytes: sumStaticFiles(jsFiles, true),
      cssGzipBytes: sumStaticFiles(cssFiles, true),
      jsFiles,
      cssFiles,
      clientModuleCount: clientModules.length,
      largestClientModules: clientModules
        .filter((name) => name.startsWith("[project]/src/"))
        .slice(0, 20)
        .map((name) => name.replace("[project]/", "")),
    });
  }
}

reports
  .sort((left, right) => (right.jsBytes + right.cssBytes) - (left.jsBytes + left.cssBytes))
  .forEach((report) => console.log(JSON.stringify(report)));

if (checkBudgets) {
  const failures = reports.filter((report) => publicRoutePattern.test(normalizeManifestRoute(report.route)) && report.jsGzipBytes + report.cssGzipBytes > transferBudgetBytes);
  if (failures.length > 0) {
    for (const report of failures) {
      console.error(`Bundle bütçesi aşıldı: ${report.route} = ${report.jsGzipBytes + report.cssGzipBytes} bayt (limit ${transferBudgetBytes})`);
    }
    process.exitCode = 1;
  }
  checkHtmlBudgets();
}

function readClientReferenceManifest(path) {
  const content = readFileSync(path, "utf8");
  const match = content.match(/globalThis\.__RSC_MANIFEST\["([^"]+)"\]\s*=\s*(\{.*\});?\s*$/s);
  if (!match) return null;
  try {
    return { [match[1]]: JSON.parse(match[2]) };
  } catch (error) {
    console.error(`Manifest okunamadi: ${path}`, error);
    return null;
  }
}

function findFiles(directory, suffix) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...findFiles(path, suffix));
    if (entry.isFile() && entry.name.endsWith(suffix)) found.push(path);
  }
  return found;
}

function uniqueFiles(files) {
  return [...new Set(files.map((file) => file.replace(/^\/_next\//, "").replace(/^\/?/, "")).filter(Boolean))].sort();
}

function sumStaticFiles(files, gzip = false) {
  return files.reduce((total, file) => {
    const path = join(buildDir, file);
    const fallbackPath = join(staticDir, relative("static", file));
    if (existsSync(path)) return total + (gzip ? gzipSync(readFileSync(path)).byteLength : statSync(path).size);
    if (existsSync(fallbackPath)) return total + (gzip ? gzipSync(readFileSync(fallbackPath)).byteLength : statSync(fallbackPath).size);
    return total;
  }, 0);
}

function normalizeManifestRoute(route) {
  return route.replace(/\/\([^/]+\)/g, "").replace(/\/page$/, "") || "/";
}

function checkHtmlBudgets() {
  const budgets = [
    { directory: appServerDir, filename: "index.html", gzipLimit: 90 * 1024 },
    { directory: join(appServerDir, "kategori"), filename: ".html", gzipLimit: 70 * 1024 },
    { directory: join(appServerDir, "oyun"), filename: ".html", gzipLimit: 80 * 1024 },
  ];

  for (const budget of budgets) {
    if (!existsSync(budget.directory)) continue;
    const files = budget.filename === "index.html"
      ? [join(budget.directory, budget.filename)].filter(existsSync)
      : findFiles(budget.directory, budget.filename);
    for (const path of files) {
      const html = readFileSync(path);
      const gzipBytes = gzipSync(html).byteLength;
      const domNodes = (html.toString("utf8").match(/<[a-z][^!/? >]*/gi) ?? []).length;
      if (gzipBytes > budget.gzipLimit) {
        console.error(`HTML bütçesi aşıldı: ${path} = ${gzipBytes} bayt (limit ${budget.gzipLimit})`);
        process.exitCode = 1;
      }
      if (domNodes > 1500) {
        console.error(`DOM bütçesi aşıldı: ${path} = ${domNodes} düğüm (limit 1500)`);
        process.exitCode = 1;
      }
    }
  }
}
