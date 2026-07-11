import { loadImportEnv } from "@/import/env";
import { rollbackGameCovers } from "@/import/covers/game-cover-sync";
import { getCoverOptions, hasFlag } from "./cover-options";

async function main() {
  loadImportEnv();
  const { limit } = getCoverOptions();
  if (!hasFlag("--confirm")) throw new Error("Rollback için --confirm bayrağı gerekli.");
  console.log(JSON.stringify(await rollbackGameCovers(limit), null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
