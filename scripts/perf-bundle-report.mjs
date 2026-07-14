import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const buildDir = ".next";
const staticDir = join(buildDir, "static");
const appServerDir = join(buildDir, "server", "app");

if (!existsSync(appServerDir)) {
  console.error("Build manifest bulunamadi. Once `pnpm build` calistirin.");
  process.exit(1);
}

const requestedRoutes = new Set(process.argv.slice(2));
const reports = [];

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

function sumStaticFiles(files) {
  return files.reduce((total, file) => {
    const path = join(buildDir, file);
    const fallbackPath = join(staticDir, relative("static", file));
    if (existsSync(path)) return total + statSync(path).size;
    if (existsSync(fallbackPath)) return total + statSync(fallbackPath).size;
    return total;
  }, 0);
}
