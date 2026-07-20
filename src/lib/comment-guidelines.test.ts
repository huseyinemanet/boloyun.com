import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("yorum alanı kaydırılabilir kurallar dialogunu gösterir", () => {
  const comments = readSource("src/app/(public)/oyun/[slug]/lazy-comments.tsx");
  const guidelines = readSource("src/app/(public)/oyun/[slug]/comment-guidelines-dialog.tsx");

  assert.match(comments, /<CommentGuidelinesDialog \/>/);
  assert.match(guidelines, /Yorum kuralları/);
  assert.match(guidelines, /overflow-y-auto/);
  assert.match(guidelines, /Kişisel bilgilerini koru/);
  assert.match(guidelines, /Yorumlar yayınlanmadan önce incelenir/);
});
