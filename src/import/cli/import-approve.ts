import { loadImportEnv } from "@/import/env";
import { approveImports } from "@/import/publish/approve-imports";
import { getLimit } from "./args";

async function main() {
  loadImportEnv();

  const results = await approveImports(getLimit(10));
  console.log(JSON.stringify({
    status: "approve_complete",
    count: results.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
