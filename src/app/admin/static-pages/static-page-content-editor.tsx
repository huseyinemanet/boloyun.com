"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  parseStaticPageEditorContent,
  serializeStaticPageEditorContent,
  type StaticPageEditorSection,
} from "@/lib/static-page-editor-content";
import {
  encodeStaticPageLinkUrl,
  normalizeStaticPageLinkUrl,
  staticPageInlineMarkupToHtml,
} from "@/lib/static-page-inline-format";

type StaticPageContentEditorProps = {
  initialValue: string;
  error?: string;
};

const EMPTY_SECTION: StaticPageEditorSection = { heading: "", paragraphs: [""] };

export function StaticPageContentEditor({ initialValue, error }: StaticPageContentEditorProps) {
  const [sections, setSections] = useState<StaticPageEditorSection[]>(() => {
    const parsed = parseStaticPageEditorContent(initialValue);
    return parsed.length ? parsed : [{ ...EMPTY_SECTION, paragraphs: [...EMPTY_SECTION.paragraphs] }];
  });
  const serializedContent = serializeStaticPageEditorContent(sections);
  const errorId = "content-error";
  const descriptionId = "content-description";

  function updateSection(index: number, update: (section: StaticPageEditorSection) => StaticPageEditorSection) {
    setSections((current) => current.map((section, sectionIndex) => (
      sectionIndex === index ? update(section) : section
    )));
  }

  function addSection() {
    setSections((current) => [...current, { heading: "", paragraphs: [""] }]);
  }

  function removeSection(index: number) {
    setSections((current) => current.length === 1
      ? [{ heading: "", paragraphs: [""] }]
      : current.filter((_, sectionIndex) => sectionIndex !== index));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <FieldLabel htmlFor="content-heading-0">
            İçerik <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </FieldLabel>
          <FieldDescription id={descriptionId} className="mt-1">
            Sayfada görüneceği düzende bölüm ve paragrafları düzenleyin.
          </FieldDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <PlusIcon /> Bölüm ekle
        </Button>
      </div>

      <input type="hidden" name="content" value={serializedContent} />

      <div
        className="overflow-hidden rounded-md border border-border bg-background"
        aria-describedby={error ? errorId : descriptionId}
      >
        {sections.map((section, sectionIndex) => (
          <section
            key={sectionIndex}
            className="border-b border-border p-4 last:border-b-0 md:p-5"
            aria-labelledby={`content-heading-${sectionIndex}`}
          >
            <div className="flex items-start gap-2">
              <Input
                id={`content-heading-${sectionIndex}`}
                value={section.heading}
                onChange={(event) => updateSection(sectionIndex, (current) => ({
                  ...current,
                  heading: event.target.value,
                }))}
                placeholder="Bölüm başlığı"
                aria-label={`${sectionIndex + 1}. bölüm başlığı`}
                className="h-auto flex-1 border-0 bg-transparent px-0 py-1 text-lg font-semibold shadow-none focus-visible:ring-0"
              />
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={sectionIndex === 0}
                  onClick={() => moveSection(sectionIndex, -1)}
                  aria-label={`${sectionIndex + 1}. bölümü yukarı taşı`}
                  title="Yukarı taşı"
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={sectionIndex === sections.length - 1}
                  onClick={() => moveSection(sectionIndex, 1)}
                  aria-label={`${sectionIndex + 1}. bölümü aşağı taşı`}
                  title="Aşağı taşı"
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeSection(sectionIndex)}
                  aria-label={`${sectionIndex + 1}. bölümü sil`}
                  title="Bölümü sil"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <div key={paragraphIndex} className="group/paragraph flex items-start gap-2">
                  <RichTextParagraph
                    value={paragraph}
                    onChange={(nextValue) => updateSection(sectionIndex, (current) => ({
                      ...current,
                      paragraphs: current.paragraphs.map((item, itemIndex) => (
                        itemIndex === paragraphIndex ? nextValue : item
                      )),
                    }))}
                    label={`${sectionIndex + 1}. bölüm, ${paragraphIndex + 1}. paragraf`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => updateSection(sectionIndex, (current) => ({
                      ...current,
                      paragraphs: current.paragraphs.length === 1
                        ? [""]
                        : current.paragraphs.filter((_, itemIndex) => itemIndex !== paragraphIndex),
                    }))}
                    aria-label={`${paragraphIndex + 1}. paragrafı sil`}
                    title="Paragrafı sil"
                    className="mt-1 shrink-0 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover/paragraph:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-muted-foreground"
              onClick={() => updateSection(sectionIndex, (current) => ({
                ...current,
                paragraphs: [...current.paragraphs, ""],
              }))}
            >
              <PlusIcon /> Paragraf ekle
            </Button>
          </section>
        ))}
      </div>

      {error ? (
        <FieldDescription id={errorId} className="font-medium text-destructive">{error}</FieldDescription>
      ) : null}
    </Field>
  );
}

function RichTextParagraph({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const currentValueRef = useRef(value);
  const initialValueRef = useRef(value);

  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node && !initializedRef.current) {
      node.innerHTML = staticPageInlineMarkupToHtml(initialValueRef.current);
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === currentValueRef.current) return;
    currentValueRef.current = value;
    editor.innerHTML = staticPageInlineMarkupToHtml(value);
  }, [value]);

  function commitValue() {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = serializeRichText(editor).trim();
    currentValueRef.current = nextValue;
    onChange(nextValue);
  }

  function runCommand(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false);
    commitValue();
  }

  function addLink() {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    const selectedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    if (!selectedRange || selectedRange.collapsed || !editor.contains(selectedRange.commonAncestorContainer)) {
      window.alert("Önce bağlantı verilecek metni seçin.");
      return;
    }
    const url = window.prompt("Bağlantı adresi (https://…)");
    if (url === null) return;
    const normalizedUrl = normalizeStaticPageLinkUrl(url);
    if (!normalizedUrl) {
      window.alert("Geçerli bir http veya https bağlantısı girin.");
      return;
    }
    selection?.removeAllRanges();
    selection?.addRange(selectedRange);
    document.execCommand("createLink", false, normalizedUrl);
    commitValue();
  }

  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-muted/25 focus-within:border-ring focus-within:bg-background focus-within:ring-1 focus-within:ring-ring/40">
      <div role="toolbar" aria-label={`${label} biçimlendirme araçları`} className="flex items-center gap-0.5 border-b border-border bg-muted/50 px-1 py-1">
        <FormatButton label="Kalın" onMouseDown={() => runCommand("bold")}><strong>B</strong></FormatButton>
        <FormatButton label="İtalik" onMouseDown={() => runCommand("italic")}><em>I</em></FormatButton>
        <FormatButton label="Altı çizili" onMouseDown={() => runCommand("underline")}><u>U</u></FormatButton>
        <FormatButton label="Bağlantı ver" onMouseDown={addLink}><LinkIcon /></FormatButton>
      </div>
      <div
        ref={setEditorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="false"
        data-placeholder="Paragraf metni"
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
        className="min-h-16 px-3 py-2 text-sm leading-7 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
      />
    </div>
  );
}

function FormatButton({ label, onMouseDown, children }: { label: string; onMouseDown: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      className="grid size-7 place-items-center rounded text-xs text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

function serializeRichText(root: HTMLElement) {
  return Array.from(root.childNodes).map(serializeRichNode).join("");
}

function serializeRichNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";

  const content = Array.from(node.childNodes).map(serializeRichNode).join("");
  switch (node.tagName) {
    case "B":
    case "STRONG":
      return `[[b]]${content}[[/b]]`;
    case "I":
    case "EM":
      return `[[i]]${content}[[/i]]`;
    case "U":
      return `[[u]]${content}[[/u]]`;
    case "A": {
      const encodedUrl = encodeStaticPageLinkUrl(node.getAttribute("href") ?? "");
      return encodedUrl ? `[[a:${encodedUrl}]]${content}[[/a]]` : content;
    }
    case "BR":
      return " ";
    default:
      return content;
  }
}
