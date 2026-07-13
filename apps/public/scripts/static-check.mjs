import { execFileSync } from "node:child_process";

const forbidden = [
  "force-dynamic",
  "cookies\\(",
  "getCurrentProfile\\(",
  "from \"next/headers\"",
  "from 'next/headers'",
];

for (const pattern of forbidden) {
  try {
    const result = execFileSync("rg", ["-n", pattern, "app", "components", "lib"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.trim()) {
      console.error(`Static app contains forbidden runtime pattern: ${pattern}`);
      console.error(result);
      process.exit(1);
    }
  } catch (error) {
    if (error.status === 1) continue;
    throw error;
  }
}

console.log("Static public app check passed.");
