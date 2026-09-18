import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

test("Supabase selects never request wildcard or implicit full rows", () => {
  const offenders: string[] = [];
  for (const file of readdirSync("src", { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))) {
    const full = path.join("src", file);
    const source = ts.createSourceFile(full, readFileSync(full, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "select") {
        const argument = node.arguments[0];
        if (!argument || (ts.isStringLiteral(argument) && argument.text.includes("*"))) offenders.push(full);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(offenders, []);
});

test("related games cannot restore per-page thousand-row relation downloads", () => {
  const source = readFileSync("src/lib/games/public-queries.ts", "utf8");
  const related = source.slice(source.indexOf("const getRelatedPublishedGamesCached"), source.indexOf("export const getRelatedPublishedGames"));
  assert.doesNotMatch(related, /\.limit\(1000\)/);
  assert.match(related, /getRelatedCandidateLinksCached\("category"/);
  assert.match(related, /getRelatedCandidateLinksCached\("tag"/);
  assert.match(related, /row\.game_id !== gameId/);
  assert.match(source, /\.limit\(251\)/);
});

test("sitemap tag counts are aggregated in the database and public search rate checks stay off DB", () => {
  const sitemap = readFileSync("src/lib/db-seo.ts", "utf8");
  assert.match(sitemap, /rpc\("get_tag_published_counts"/);
  assert.doesNotMatch(sitemap, /\.from\("game_tags"\)/);
  assert.match(sitemap, /revalidate: CATALOG_TTL\.sitemap/);
  const search = readFileSync("src/app/api/search/route.ts", "utf8");
  assert.match(search, /consumePublicReadLimit/);
  assert.doesNotMatch(search, /consumeRateLimits|caches as CacheStorage/);
});

test("catalogue migration removes direct public reads without deleting games", () => {
  const migration = readFileSync("supabase/migrations/20260918184507_restrict_direct_catalog_reads.sql", "utf8");
  assert.match(migration, /from public, anon, authenticated;/);
  assert.match(migration, /to service_role;/);
  assert.doesNotMatch(migration, /\b(delete\s+from|truncate|drop\s+table)\b/i);
});

test("social image crawls do not fetch unused game recommendations", () => {
  for (const route of ["paylasim-kapagi", "paylasim-gorseli"]) {
    const source = readFileSync(`src/app/(public)/oyun/[slug]/${route}/route.ts`, "utf8");
    assert.match(source, /getPublishedGameDetailBySlug\(slug\)/);
    assert.doesNotMatch(source, /getPublicGamePageBySlug/);
  }
});
