export type StaticPageEditorSection = {
  heading: string;
  paragraphs: string[];
};

export function parseStaticPageEditorContent(value: string): StaticPageEditorSection[] {
  return value.split(/\n\s*---\s*\n/).flatMap((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const [heading, ...paragraphs] = lines;
    return heading ? [{ heading, paragraphs }] : [];
  });
}

export function serializeStaticPageEditorContent(sections: StaticPageEditorSection[]) {
  return sections
    .map((section) => [section.heading.trim(), ...section.paragraphs.map((paragraph) => paragraph.trim())]
      .filter(Boolean)
      .join("\n"))
    .filter(Boolean)
    .join("\n\n---\n\n");
}
