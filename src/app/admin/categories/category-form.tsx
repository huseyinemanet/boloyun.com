"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryRow } from "@/lib/db-categories";
import { saveCategoryAction, type CategoryFormState } from "./actions";

const initialCategoryFormState: CategoryFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveCategoryAction, initialCategoryFormState);
  const lastToastKey = useRef("");

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;

    const toastKey = `${state.status}:${state.message}`;
    if (lastToastKey.current === toastKey) return;
    lastToastKey.current = toastKey;

    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
      return;
    }

    toast.error(state.message);
  }, [router, state.message, state.status]);

  return (
    <form action={formAction} noValidate autoComplete="off" className="mt-4 grid gap-3">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <Field label="Ad" name="name" defaultValue={category?.name ?? ""} required error={state.fieldErrors.name} />
      <Field label="Slug" name="slug" defaultValue={category?.slug ?? ""} required error={state.fieldErrors.slug} />
      <label className="block text-sm font-bold">
        Durum
        <Select name="status" defaultValue={category?.status ?? "active"}>
          <SelectTrigger className="mt-1 h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <TextArea label="Açıklama" name="description" defaultValue={category?.description ?? ""} rows={3} />
      <AdminCheckboxField name="show_in_sidebar" label="Sol menüde göster" defaultChecked={category?.show_in_sidebar ?? false} />
      <Field label="Sol menü sırası" name="sidebar_sort_order" defaultValue={String(category?.sidebar_sort_order ?? 0)} type="number" />
      <TextArea label="Icon SVG" name="icon_svg" defaultValue={category?.icon_svg ?? ""} rows={3} />
      <Field label="Icon URL" name="icon_url" defaultValue={category?.icon_url ?? ""} />
      <Field label="SEO title" name="seo_title" defaultValue={category?.seo_title ?? ""} />
      <TextArea label="SEO description" name="seo_description" defaultValue={category?.seo_description ?? ""} rows={3} />
      <Field label="Open Graph görsel URL" name="og_image_url" defaultValue={category?.og_image_url ?? ""} />
      <AdminCheckboxField name="is_indexable" label="Arama motorlarında indekslenebilir" defaultChecked={category?.is_indexable ?? true} />

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={state.status === "error" ? "rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" : "rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success"}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={category ? "Güncelle" : "Kategori Ekle"} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className="h-10 text-sm font-bold">
      {pending ? "Kaydediliyor..." : label}
    </Button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = false,
  error,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  error?: string;
  type?: "text" | "number";
}) {
  const errorId = `${name}-error`;

  return (
    <label className="block text-sm font-bold">
      <span>
        {label}
        {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </span>
      <Input
        name={name}
        type={type}
        min={type === "number" ? 0 : undefined}
        autoComplete="off"
        defaultValue={defaultValue}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 h-10"
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TextArea({ label, name, defaultValue, rows }: { label: string; name: string; defaultValue: string; rows: number }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Textarea name={name} autoComplete="off" defaultValue={defaultValue} rows={rows} className="mt-1 resize-y" />
    </label>
  );
}
