import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageDirectory = path.dirname(require.resolve("@ruffle-rs/ruffle"));
const destination = path.resolve("public/ruffle");
const assets = readdirSync(packageDirectory).filter((name) => (
  name === "ruffle.js"
  || name.endsWith(".wasm")
  || (/^core\.ruffle\..+\.js$/.test(name) && !name.endsWith(".map"))
));

if (!assets.includes("ruffle.js") || !assets.some((name) => name.endsWith(".wasm"))) {
  throw new Error("Sabitlenmiş Ruffle paketi gerekli runtime dosyalarını içermiyor.");
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const asset of assets) copyFileSync(path.join(packageDirectory, asset), path.join(destination, asset));
