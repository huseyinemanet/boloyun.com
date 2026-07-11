export type AdminStaticPageValues = {
  id: string;
  title: string;
  slug: string;
  content: string;
  seo_title: string;
  seo_description: string;
  status: "published" | "draft";
  og_image_url: string;
  is_indexable: boolean;
};

export type AdminStaticPageFieldErrors = Partial<Record<keyof AdminStaticPageValues, string>>;

export function normalizeAdminStaticPageStatus(value: string): AdminStaticPageValues["status"] {
  return value === "published" ? "published" : "draft";
}

export function normalizeAdminStaticPageValues(input: Record<string, unknown>): AdminStaticPageValues {
  return {
    id: String(input.id ?? "").trim(),
    title: String(input.title ?? "").trim(),
    slug: String(input.slug ?? "").trim(),
    content: String(input.content ?? "").trim(),
    seo_title: String(input.seo_title ?? "").trim(),
    seo_description: String(input.seo_description ?? "").trim(),
    status: normalizeAdminStaticPageStatus(String(input.status ?? "published")),
    og_image_url: String(input.og_image_url ?? "").trim(),
    is_indexable: input.is_indexable === true || input.is_indexable === "on",
  };
}

export function validateAdminStaticPageValues(values: AdminStaticPageValues): AdminStaticPageFieldErrors {
  const fieldErrors: AdminStaticPageFieldErrors = {};

  if (!values.title) fieldErrors.title = "Başlık gerekli.";
  if (!values.slug) {
    fieldErrors.slug = "Slug gerekli.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    fieldErrors.slug = "Slug küçük harf, rakam ve tire içermeli.";
  }

  if (!values.content) {
    fieldErrors.content = "İçerik gerekli.";
  } else if (!hasValidEditorBlock(values.content)) {
    fieldErrors.content = "En az bir bölüm başlığı ve paragraf ekleyin.";
  }

  if (values.og_image_url && !isValidUrl(values.og_image_url)) {
    fieldErrors.og_image_url = "Geçerli bir URL girin.";
  }

  return fieldErrors;
}

export function adminStaticPageValuesToFormData(values: AdminStaticPageValues) {
  const formData = new FormData();
  formData.set("id", values.id);
  formData.set("title", values.title);
  formData.set("slug", values.slug);
  formData.set("content", values.content);
  formData.set("seo_title", values.seo_title);
  formData.set("seo_description", values.seo_description);
  formData.set("status", values.status);
  formData.set("og_image_url", values.og_image_url);
  if (values.is_indexable) formData.set("is_indexable", "on");
  return formData;
}

function hasValidEditorBlock(value: string) {
  return value.split(/\n\s*---\s*\n/).some((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length >= 2;
  });
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
