import { loadImportEnv } from "@/import/env";
import { syncGameCovers } from "@/import/covers/game-cover-sync";
import { getCoverOptions } from "./cover-options";

async function main() {
  loadImportEnv();
  const options = getCoverOptions();
  console.log(JSON.stringify({ status: "covers_migrate_started", ...options }));
  console.log(JSON.stringify(await syncGameCovers(options), null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
