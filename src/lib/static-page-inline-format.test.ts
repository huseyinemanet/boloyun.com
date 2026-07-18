import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeStaticPageLinkUrl,
  normalizeStaticPageLinkUrl,
  staticPageInlineMarkupToHtml,
} from "./static-page-inline-format";

test("renders the allowed basic inline formats", () => {
  const link = encodeStaticPageLinkUrl("https://boloyun.com/oyun/pizza-cafe");
  const markup = `[[b]]Kalın[[/b]] [[i]]italik[[/i]] [[u]]altı çizili[[/u]] [[a:${link}]]oyun[[/a]]`;

  assert.equal(
    staticPageInlineMarkupToHtml(markup),
    '<strong>Kalın</strong> <em>italik</em> <u>altı çizili</u> <a href="https://boloyun.com/oyun/pizza-cafe" target="_blank" rel="noopener noreferrer">oyun</a>',
  );
});

test("escapes raw HTML and rejects unsafe link protocols", () => {
  assert.equal(staticPageInlineMarkupToHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(normalizeStaticPageLinkUrl("javascript:alert(1)"), null);
  assert.equal(encodeStaticPageLinkUrl("data:text/html,test"), null);
});
