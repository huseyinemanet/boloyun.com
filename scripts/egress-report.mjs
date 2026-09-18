import { createInterface } from "node:readline";
import { createHmac, randomBytes } from "node:crypto";

// Combine JSON Nginx logs and timestamped Docker app/worker output on stdin.
// Supply the actual elapsed interval; never label a short sample as a full day.
const hours = Number(process.argv.find((a) => a.startsWith("--hours="))?.split("=")[1]);
if (!Number.isFinite(hours) || hours <= 0) throw new Error("Usage: node scripts/egress-report.mjs --hours=24 < combined.log");
const hashSecret = process.env.EGRESS_AUDIT_HASH_SECRET || randomBytes(32);
const endpoints = new Map();
const routes = new Map();
const clients = new Map();
let dbBytes = 0, dbQueries = 0, httpBytes = 0, httpRequests = 0, rejected = 0, malformed = 0;
const add = (map, key, bytes = 0) => {
  const value = map.get(key) || { requests: 0, bytes: 0 };
  value.requests += 1; value.bytes += bytes; map.set(key, value);
};
for await (const line of createInterface({ input: process.stdin })) {
  const start = line.indexOf("{");
  if (start < 0) continue;
  let record;
  try { record = JSON.parse(line.slice(start)); } catch { malformed += 1; continue; }
  if (record.event === "supabase_response" && Number.isFinite(record.responseBytes) && record.responseBytes >= 0) {
    dbBytes += record.responseBytes; dbQueries += 1;
    add(endpoints, record.endpoint, record.responseBytes);
  } else if (record.host === "boloyun.com" && typeof record.route === "string" && Number.isFinite(record.bytes) && record.bytes >= 0) {
    httpRequests += 1; httpBytes += record.bytes;
    if ([403, 429].includes(record.status)) rejected += 1;
    add(routes, record.route.split("?")[0], record.bytes);
    add(clients, createHmac("sha256", hashSecret).update(String(record.ip)).digest("hex").slice(0, 16));
  }
}
const top = (map) => [...map].sort((a, b) => b[1].bytes - a[1].bytes || b[1].requests - a[1].requests).slice(0, 20);
const normalizedDailyMB = dbBytes / 1e6 / hours * 24;
console.log(JSON.stringify({
  intervalHours: hours,
  database: { queries: dbQueries, decodedResponseBytes: dbBytes, normalizedDailyMB, projected31DayGB: normalizedDailyMB * 31 / 1000,
    signal: dbQueries === 0 ? "NO_TELEMETRY_OR_NO_QUERIES" : normalizedDailyMB >= 300 ? "INVESTIGATE" : normalizedDailyMB >= 150 ? "CRITICAL" : normalizedDailyMB >= 100 ? "WARNING" : "WITHIN_TARGET" },
  http: { requests: httpRequests, bytes: httpBytes, rejected },
  topDatabaseEndpoints: top(endpoints), topHttpRoutes: top(routes), topClientHashes: top(clients), malformedJsonLines: malformed,
  limitations: "Decoded DB response bytes are an estimate, not Supabase billing. HTTP bytes are separate. No telemetry does not prove zero egress. Include app AND worker logs. Bot visits are not human pageviews.",
}, null, 2));
