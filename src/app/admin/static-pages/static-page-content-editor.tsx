"use client";

import { useCallback, useRef, useState } from "react";
import { LinkIcon } from "@/components/icons/app-icons";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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

export function StaticPageContentEditor({ initialValue, error }: StaticPageContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const initialValueRef = useRef(initialValue);
  const [serializedContent, setSerializedContent] = useState(initialValue);
  const errorId = "content-error";
  const descriptionId = "content-description";

  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (!node || initializedRef.current) return;
    node.innerHTML = editorContentToHtml(initialValueRef.current);
    initializedRef.current = true;
  }, []);

  function commitValue() {
    const editor = editorRef.current;
    if (!editor) return;
    setSerializedContent(serializeEditorContent(editor));
  }

  function runCommand(command: "bold" | "italic" | "underline") {
    const editor = editorRef.current;
    if (!editor || !selectionIsInside(editor)) {
      window.alert("Önce biçimlendirilecek metni seçin.");
      return;
    }
    editor.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false);
    commitValue();
  }

  function addLink() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const selectedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    if (!editor || !selectedRange || selectedRange.collapsed || !editor.contains(selectedRange.commonAncestorContainer)) {
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
    <Field data-invalid={error ? true : undefined}>
      <div>
        <FieldLabel htmlFor="static-page-content">
          İçerik <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </FieldLabel>
        <FieldDescription id={descriptionId} className="mt-1">
          Sayfanın tüm içeriğini tek alanda düzenleyin.
        </FieldDescription>
      </div>

      <input type="hidden" name="content" value={serializedContent} />

      <div
        className="overflow-hidden rounded-md border border-border bg-background focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40"
        aria-describedby={error ? errorId : descriptionId}
      >
        <div
          role="toolbar"
          aria-label="Metin biçimlendirme araçları"
          className="flex min-h-11 flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-3 py-2"
        >
          <FormatButton label="Kalın" onMouseDown={() => runCommand("bold")}><strong>B</strong></FormatButton>
          <FormatButton label="İtalik" onMouseDown={() => runCommand("italic")}><em>I</em></FormatButton>
          <FormatButton label="Altı çizili" onMouseDown={() => runCommand("underline")}><u>U</u></FormatButton>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <FormatButton label="Bağlantı ver" onMouseDown={addLink}><LinkIcon /></FormatButton>
        </div>

        <div
          id="static-page-content"
          ref={setEditorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Sayfa içeriği"
          aria-multiline="true"
          data-placeholder="Sayfa içeriğini buraya yazın…"
          onInput={commitValue}
          onBlur={commitValue}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          }}
          className="min-h-[420px] px-5 py-4 text-sm leading-7 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-7 [&_h2:first-child]:mt-0 [&_p]:mb-4"
        />
      </div>

      {error ? (
        <FieldDescription id={errorId} className="font-medium text-destructive">{error}</FieldDescription>
      ) : null}
    </Field>
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

function selectionIsInside(editor: HTMLElement) {
  const selection = window.getSelection();
  return Boolean(selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer));
}

function editorContentToHtml(value: string) {
  return parseStaticPageEditorContent(value).map((section) => {
    const heading = `<h2>${escapeHtml(section.heading)}</h2>`;
    const paragraphs = section.paragraphs
      .map((paragraph) => `<p>${staticPageInlineMarkupToHtml(paragraph)}</p>`)
      .join("");
    return heading + paragraphs;
  }).join("");
}

function serializeEditorContent(editor: HTMLElement) {
  const sections: StaticPageEditorSection[] = [];
  let currentSection: StaticPageEditorSection | null = null;

  for (const node of editor.childNodes) {
    if (node instanceof HTMLHeadingElement) {
      const heading = node.textContent?.trim() ?? "";
      if (!heading) continue;
      currentSection = { heading, paragraphs: [] };
      sections.push(currentSection);
      continue;
    }

    const paragraph = serializeBlock(node).trim();
    if (!paragraph) continue;
    if (!currentSection) {
      currentSection = { heading: "İçerik", paragraphs: [] };
      sections.push(currentSection);
    }
    currentSection.paragraphs.push(paragraph);
  }

  return serializeStaticPageEditorContent(sections);
}

function serializeBlock(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  return Array.from(node.childNodes).map(serializeInlineNode).join("");
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";

  const content = Array.from(node.childNodes).map(serializeInlineNode).join("");
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
