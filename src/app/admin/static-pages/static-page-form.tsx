import type { StaticPageRow } from "@/lib/db-static-pages";
import { staticPageEditorContent } from "@/lib/db-static-pages";
import { normalizeAdminStaticPageStatus } from "@/lib/admin-static-page-validation";
import { absoluteUrl } from "@/lib/seo/metadata";
import { StaticPageEditorForm, type StaticPageEditorInitialValues } from "./static-page-editor-form";

type StaticPageFormProps = {
  page: StaticPageRow;
  mode?: "create" | "edit";
};

export function StaticPageForm({ page, mode = "edit" }: StaticPageFormProps) {
  const initialValues: StaticPageEditorInitialValues = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    content: staticPageEditorContent(page),
    seo_title: page.seo_title ?? "",
    seo_description: page.seo_description ?? "",
    status: normalizeAdminStaticPageStatus(page.status),
    og_image_url: page.og_image_url ?? "",
    is_indexable: page.is_indexable ?? true,
    canonical_url: absoluteUrl(`/sayfa/${page.slug}`),
  };

  return <StaticPageEditorForm initialValues={initialValues} mode={mode} />;
}
