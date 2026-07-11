"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLinkIcon } from "lucide-react";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveStaticPageAction, type StaticPageFormValues } from "./actions";

export type StaticPageEditorInitialValues = StaticPageFormValues & {
  canonical_url: string;
};

type StaticPageEditorFormProps = {
  initialValues: StaticPageEditorInitialValues;
  mode?: "create" | "edit";
};

const initialStaticPageFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
} as const;

export function StaticPageEditorForm({ initialValues, mode = "edit" }: StaticPageEditorFormProps) {
  const [state, formAction] = useActionState(saveStaticPageAction, initialStaticPageFormState);
  const values = state.values ?? initialValues;
  const isCreate = mode === "create";

  return (
    <form action={formAction} noValidate className="space-y-4">
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
        <TextAreaField
          label="İçerik"
          name="content"
          value={values.content}
          rows={22}
          required
          description="Her bloğun ilk satırı bölüm başlığıdır. Bölümleri yalnızca --- satırıyla ayırın."
          error={state.fieldErrors.content}
          className="font-mono text-xs leading-6"
          placeholder={"Bölüm başlığı\nİlk paragraf\nİkinci paragraf\n\n---\n\nYeni bölüm başlığı\nParagraf"}
        />
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
          <SubmitButton label={isCreate ? "Sayfayı Oluştur" : "Sayfayı Güncelle"} />
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
  name: keyof StaticPageFormValues;
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
  className,
  placeholder,
}: {
  label: string;
  name: keyof StaticPageFormValues;
  value: string;
  rows: number;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  placeholder?: string;
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
        className={className}
        placeholder={placeholder}
      />
      {error ? <FieldDescription id={errorId} className="font-medium text-destructive">{error}</FieldDescription> : null}
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
    </Field>
  );
}

function SelectField({ label, name, value, error }: { label: string; name: keyof StaticPageFormValues; value: string; error?: string }) {
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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className="font-bold">
      {pending ? "Kaydediliyor..." : label}
    </Button>
  );
}
