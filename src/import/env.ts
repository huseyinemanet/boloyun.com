import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadImportEnv() {
  for (const filename of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), filename);
    if (existsSync(path)) {
      config({ path, quiet: true });
    }
  }
}
