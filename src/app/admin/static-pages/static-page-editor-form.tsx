"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminStaticPageFieldErrors,
  type AdminStaticPageValues,
  normalizeAdminStaticPageStatus,
  validateAdminStaticPageValues,
} from "@/lib/admin-static-page-validation";
import { StaticPageContentEditor } from "./static-page-content-editor";

export type StaticPageEditorInitialValues = AdminStaticPageValues & {
  canonical_url: string;
};

type FormState = {
  message: string;
  fieldErrors: AdminStaticPageFieldErrors;
  values: AdminStaticPageValues;
};

type StaticPageEditorFormProps = {
  initialValues: StaticPageEditorInitialValues;
  mode?: "create" | "edit";
};

export function StaticPageEditorForm({ initialValues, mode = "edit" }: StaticPageEditorFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ message: "", fieldErrors: {}, values: initialValues });
  const [isPending, startTransition] = useTransition();
  const values = state.values;
  const isCreate = mode === "create";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextValues: AdminStaticPageValues = {
      id: String(formData.get("id") ?? "").trim(),
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      content: String(formData.get("content") ?? "").trim(),
      seo_title: String(formData.get("seo_title") ?? "").trim(),
      seo_description: String(formData.get("seo_description") ?? "").trim(),
      status: normalizeAdminStaticPageStatus(String(formData.get("status") ?? "published")),
      og_image_url: String(formData.get("og_image_url") ?? "").trim(),
      is_indexable: formData.get("is_indexable") === "on",
    };
    const fieldErrors = validateAdminStaticPageValues(nextValues);

    if (Object.keys(fieldErrors).length) {
      setState({ message: "Lütfen işaretli alanları kontrol edin.", fieldErrors, values: nextValues });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/static-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextValues),
      });

      if (response.ok) {
        router.push("/admin/static-pages");
        router.refresh();
        return;
      }

      const result = await response.json().catch(() => null) as Partial<FormState> | null;
      setState({
        message: result?.message || "Sayfa kaydedilemedi.",
        fieldErrors: result?.fieldErrors ?? {},
        values: result?.values ?? nextValues,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <input type="hidden" name="id" value={values.id} />
      {state.message ? (
        <p role="alert" aria-live="polite" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.message}
        </p>
      ) : null}

      <section className="space-y-4 rounded-md border border-border bg-card p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Başlık" name="title" value={values.title} required placeholder="Örn. Çocuk Güvenliği" error={state.fieldErrors.title} />
          <TextField label="Slug" name="slug" value={values.slug} required placeholder="cocuk-guvenligi" error={state.fieldErrors.slug} />
        </div>
        <StaticPageContentEditor initialValue={values.content} error={state.fieldErrors.content} />
      </section>

      <section className="space-y-4 rounded-md border border-border bg-card p-4 md:p-5">
        <div>
          <h2 className="font-bold">SEO ve yayın ayarları</h2>
          <p className="mt-1 text-xs text-muted-foreground">Arama sonucu görünümünü ve sayfanın yayın durumunu belirleyin.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="SEO başlığı" name="seo_title" value={values.seo_title} />
          <TextField label="Open Graph görsel URL" name="og_image_url" value={values.og_image_url} error={state.fieldErrors.og_image_url} />
        </div>
        <TextAreaField label="SEO açıklaması" name="seo_description" value={values.seo_description} rows={3} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Durum" name="status" value={values.status} error={state.fieldErrors.status} />
          <AdminCheckboxField name="is_indexable" label="Arama motorlarında indekslenebilir" defaultChecked={values.is_indexable} fieldClassName="self-end" />
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
          <p className="font-bold">Canonical URL</p>
          <p className="mt-1 break-all text-muted-foreground">{initialValues.canonical_url}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline"><Link href="/admin/static-pages">İptal</Link></Button>
        <div className="flex items-center gap-2">
          {!isCreate && values.status === "published" ? <Button asChild variant="outline"><Link href={`/sayfa/${values.slug}`} target="_blank">Sayfayı Görüntüle <ExternalLinkIcon /></Link></Button> : null}
          <SubmitButton label={isCreate ? "Sayfayı Oluştur" : "Sayfayı Güncelle"} pending={isPending} />
        </div>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  value,
  required = false,
  placeholder,
  error,
}: {
  label: string;
  name: keyof AdminStaticPageValues;
  value: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </FieldLabel>
      <Input
        id={name}
        name={name}
        defaultValue={value}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
      />
      {error ? <FieldDescription id={errorId} className="font-medium text-destructive">{error}</FieldDescription> : null}
    </Field>
  );
}

function TextAreaField({
  label,
  name,
  value,
  rows,
  required = false,
  description,
  error,
}: {
  label: string;
  name: keyof AdminStaticPageValues;
  value: string;
  rows: number;
  required?: boolean;
  description?: string;
  error?: string;
}) {
  const descriptionId = `${name}-description`;
  const errorId = `${name}-error`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </FieldLabel>
      <Textarea
        id={name}
        name={name}
        defaultValue={value}
        rows={rows}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : description ? descriptionId : undefined}
      />
      {error ? <FieldDescription id={errorId} className="font-medium text-destructive">{error}</FieldDescription> : null}
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
    </Field>
  );
}

function SelectField({ label, name, value, error }: { label: string; name: keyof AdminStaticPageValues; value: string; error?: string }) {
  const errorId = `${name}-error`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <Select name={name} defaultValue={value}>
        <SelectTrigger className="w-full" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="published">Yayında</SelectItem>
          <SelectItem value="draft">Taslak</SelectItem>
        </SelectContent>
      </Select>
      {error ? <FieldDescription id={errorId} className="font-medium text-destructive">{error}</FieldDescription> : null}
    </Field>
  );
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button disabled={pending} className="font-bold">
      {pending ? "Kaydediliyor..." : label}
    </Button>
  );
}
