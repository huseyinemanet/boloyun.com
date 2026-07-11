"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdRow, AdSlotRow } from "@/lib/db-ads";
import { saveAdAction, saveAdSlotAction, type AdFormState, type AdSlotFormState } from "./actions";

const initialAdSlotFormState: AdSlotFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

const initialAdFormState: AdFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export function AdSlotForm({ slot }: { slot: AdSlotRow }) {
  const [state, formAction] = useActionState(saveAdSlotAction, initialAdSlotFormState);

  return (
    <form action={formAction} noValidate autoComplete="off" className="mt-4 grid gap-3">
      <input type="hidden" name="id" value={slot.id} />
      <Field label="Slot adı" name="name" defaultValue={slot.name} required error={state.fieldErrors.name} />
      <Field label="Slot key" name="key" defaultValue={slot.key} required error={state.fieldErrors.key} />
      <TextArea label="Açıklama" name="description" defaultValue={slot.description ?? ""} rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sayfa tipi" name="page_type" defaultValue={slot.page_type ?? ""} />
        <Field label="Pozisyon" name="position" defaultValue={slot.position ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <Checkbox name="is_active" defaultChecked={slot.is_active !== false} />
        Aktif
      </label>
      <FormMessage state={state} />
      <SubmitButton label="Slotu Güncelle" />
    </form>
  );
}

export function AdForm({ slots, selectedSlot, ad }: { slots: AdSlotRow[]; selectedSlot?: AdSlotRow; ad?: AdRow }) {
  const [state, formAction] = useActionState(saveAdAction, initialAdFormState);

  return (
    <form action={formAction} noValidate autoComplete="off" className="mt-4 grid gap-3">
      <input type="hidden" name="id" value={ad?.id ?? ""} />
      <label className="block text-sm font-bold">
        <span>
          Slot
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </span>
        <Select name="slot_id" defaultValue={ad?.slot_id ?? selectedSlot?.id ?? ""}>
          <SelectTrigger className="mt-1 h-10 w-full" aria-invalid={Boolean(state.fieldErrors.slot_id)}>
            <SelectValue placeholder="Slot seç" />
          </SelectTrigger>
          <SelectContent>
            {slots.map((slot) => (
              <SelectItem key={slot.id} value={slot.id}>
                {slot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={state.fieldErrors.slot_id} />
      </label>
      <Field label="Reklam adı" name="name" defaultValue={ad?.name ?? ""} required error={state.fieldErrors.name} />
      <TextArea label="Reklam kodu" name="ad_code" defaultValue={ad?.ad_code ?? ""} rows={6} required error={state.fieldErrors.ad_code} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Öncelik" name="priority" defaultValue={String(ad?.priority ?? 0)} type="number" error={state.fieldErrors.priority} />
        <div className="grid gap-2 text-sm font-bold">
          Gösterim
          <label className="flex items-center gap-2 text-xs font-bold">
            <Checkbox name="show_desktop" defaultChecked={ad?.show_desktop !== false} />
            Desktop
          </label>
          <label className="flex items-center gap-2 text-xs font-bold">
            <Checkbox name="show_mobile" defaultChecked={ad?.show_mobile !== false} />
            Mobil
          </label>
          <FieldError message={state.fieldErrors.show} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Başlangıç" name="start_at" defaultValue={toDateTimeLocal(ad?.start_at)} type="datetime-local" error={state.fieldErrors.date} />
        <Field label="Bitiş" name="end_at" defaultValue={toDateTimeLocal(ad?.end_at)} type="datetime-local" />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <Checkbox name="is_active" defaultChecked={ad?.is_active !== false} />
        Aktif
      </label>
      <FormMessage state={state} />
      <SubmitButton label={ad ? "Reklamı Güncelle" : "Reklam Ekle"} />
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
  type = "text",
  required = false,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  error?: string;
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
        autoComplete="off"
        defaultValue={defaultValue}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 h-10"
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
  required = false,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
  required?: boolean;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <label className="block text-sm font-bold">
      <span>
        {label}
        {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </span>
      <Textarea
        name={name}
        autoComplete="off"
        defaultValue={defaultValue}
        rows={rows}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 resize-y"
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs font-medium text-destructive">
      {message}
    </span>
  );
}

function FormMessage({ state }: { state: Pick<AdFormState | AdSlotFormState, "status" | "message"> }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
      className={state.status === "error" ? "rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" : "rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success"}
    >
      {state.message}
    </p>
  );
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}
