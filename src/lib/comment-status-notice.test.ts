import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const noticeSource = readFileSync(
  path.join(process.cwd(), "src/app/(public)/oyun/[slug]/comment-status-notice.tsx"),
  "utf8",
);

test("yayınlanan yorum bildirimi başarı rengini kullanır", () => {
  assert.match(noticeSource, /approved: "border border-success\/30 bg-success\/10 text-success"/);
  assert.match(noticeSource, /role="status"/);
});

test("bekleyen ve devre dışı yorum bildirimleri başarı gibi görünmez", () => {
  assert.match(noticeSource, /pending: "bg-warning\/10 text-warning"/);
  assert.match(noticeSource, /disabled: "bg-muted text-muted-foreground"/);
});
