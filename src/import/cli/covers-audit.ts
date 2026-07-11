import { loadImportEnv } from "@/import/env";
import { auditGameCovers } from "@/import/covers/game-cover-sync";
import { getCoverOptions } from "./cover-options";

async function main() {
  loadImportEnv();
  const { limit, concurrency } = getCoverOptions(100_000);
  console.log(JSON.stringify(await auditGameCovers({ limit, concurrency }), null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
