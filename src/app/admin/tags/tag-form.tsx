"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TagRow } from "@/lib/db-tags";
import { saveTagAction, type TagFormState } from "./actions";

const initialTagFormState: TagFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

type TagFormProps = {
  tag: (TagRow & { publishedGameCount?: number }) | null;
};

export function TagForm({ tag }: TagFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveTagAction, initialTagFormState);

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <form action={formAction} noValidate autoComplete="off" className="h-fit space-y-3 rounded-md border border-border bg-card p-4">
      <input type="hidden" name="id" value={tag?.id ?? ""} />
      <h2 className="font-bold">{tag ? "Etiketi düzenle" : "Yeni etiket"}</h2>
      <Field label="Ad" name="name" defaultValue={tag?.name ?? ""} required error={state.fieldErrors.name} />
      <Field label="Slug" name="slug" defaultValue={tag?.slug ?? ""} required error={state.fieldErrors.slug} />
      <label className="block text-sm font-bold">
        Durum
        <Select name="status" defaultValue={tag?.status ?? "active"}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <Area label="Giriş metni" name="description" defaultValue={tag?.description ?? ""} rows={4} />
      <Field label="SEO başlığı" name="seo_title" defaultValue={tag?.seo_title ?? ""} />
      <Area label="SEO açıklaması" name="seo_description" defaultValue={tag?.seo_description ?? ""} rows={3} />
      <Field label="Open Graph görsel URL" name="og_image_url" defaultValue={tag?.og_image_url ?? ""} error={state.fieldErrors.og_image_url} />
      <AdminCheckboxField name="is_indexable" label="İndekslenebilir" defaultChecked={tag?.is_indexable ?? false} />
      {tag ? (
        <p className={`rounded-md p-3 text-xs font-bold ${(tag.publishedGameCount ?? 0) >= 5 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          {tag.publishedGameCount} yayınlanmış oyun. İndeksleme için en az 5 oyun gerekir.
        </p>
      ) : null}

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={state.status === "error" ? "rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" : "rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success"}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className="w-full">
      {pending ? "Kaydediliyor..." : "Kaydet"}
    </Button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = false,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <label data-invalid={error ? true : undefined} className="block text-sm font-bold">
      <span>
        {label}
        {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </span>
      <Input
        name={name}
        autoComplete="off"
        defaultValue={defaultValue}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-1"
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Area({ label, name, defaultValue, rows }: { label: string; name: string; defaultValue: string; rows: number }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Textarea name={name} defaultValue={defaultValue} rows={rows} className="mt-1" />
    </label>
  );
}
