import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const commentsSource = readFileSync(
  path.join(process.cwd(), "src/app/(public)/oyun/[slug]/comments-tabs.tsx"),
  "utf8",
);

test("yorum kartı tercih edilen adı ve shadcn avatarını gösterir", () => {
  assert.match(commentsSource, /<Avatar className="size-10">/);
  assert.match(commentsSource, /comment\.avatarUrl/);
  assert.match(commentsSource, /comment\.displayName/);
  assert.doesNotMatch(commentsSource, />\{comment\.username\}<\/strong>/);
});

test("yorum tarihi göreli görünür ve tam İstanbul tarihini title olarak taşır", () => {
  assert.match(commentsSource, /formatRelativeDateTime\(comment\.createdAt/);
  assert.match(commentsSource, /title=\{formatFullDateTime\(comment\.createdAt\)\}/);
  assert.match(commentsSource, /dateTime=\{comment\.createdAt\}/);
});
