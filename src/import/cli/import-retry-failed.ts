import { retryFailedImports } from "@/import/db/game-imports";
import { loadImportEnv } from "@/import/env";
import { getLimit } from "./args";

async function main() {
  loadImportEnv();

  const result = await retryFailedImports(getLimit(100));
  console.log(JSON.stringify({
    status: "retry_queued",
    count: result.count,
    message: "Failed kayitlar tekrar discovered durumuna alindi.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
