"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  parseStaticPageEditorContent,
  serializeStaticPageEditorContent,
  type StaticPageEditorSection,
} from "@/lib/static-page-editor-content";

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
                  <Textarea
                    value={paragraph}
                    onChange={(event) => updateSection(sectionIndex, (current) => ({
                      ...current,
                      paragraphs: current.paragraphs.map((item, itemIndex) => (
                        itemIndex === paragraphIndex ? event.target.value : item
                      )),
                    }))}
                    rows={2}
                    placeholder="Paragraf metni"
                    aria-label={`${sectionIndex + 1}. bölüm, ${paragraphIndex + 1}. paragraf`}
                    className="min-h-16 resize-y border-0 bg-muted/25 px-3 py-2 text-sm leading-7 shadow-none focus-visible:bg-background focus-visible:ring-1"
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
