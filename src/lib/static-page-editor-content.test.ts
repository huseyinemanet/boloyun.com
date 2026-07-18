import assert from "node:assert/strict";
import test from "node:test";
import {
  parseStaticPageEditorContent,
  serializeStaticPageEditorContent,
} from "./static-page-editor-content";

test("parses and serializes static page editor sections", () => {
  const content = "İlk bölüm\nİlk paragraf\nİkinci paragraf\n\n---\n\nİkinci bölüm\nSon paragraf";
  const sections = parseStaticPageEditorContent(content);

  assert.deepEqual(sections, [
    { heading: "İlk bölüm", paragraphs: ["İlk paragraf", "İkinci paragraf"] },
    { heading: "İkinci bölüm", paragraphs: ["Son paragraf"] },
  ]);
  assert.equal(serializeStaticPageEditorContent(sections), content);
});

test("normalizes empty lines without inventing content", () => {
  assert.deepEqual(parseStaticPageEditorContent("\n Başlık \n\n Paragraf \n"), [
    { heading: "Başlık", paragraphs: ["Paragraf"] },
  ]);
  assert.equal(serializeStaticPageEditorContent([{ heading: "", paragraphs: [""] }]), "");
});
