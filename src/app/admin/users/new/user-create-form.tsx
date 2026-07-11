"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateUserFormState, CreateUserFormValues } from "../actions";
import { createUserAction } from "../actions";

const initialState: CreateUserFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: {
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    display_name: "",
    password: "",
    role: "member",
  },
};

export function UserCreateForm() {
  const [state, formAction] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} noValidate autoComplete="off" className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Kullanıcı adı" name="username" required defaultValue={state.values.username} error={state.fieldErrors.username} autoComplete="username" />
        <Field label="E-posta" name="email" type="email" required defaultValue={state.values.email} error={state.fieldErrors.email} autoComplete="email" />
        <Field label="Ad" name="first_name" defaultValue={state.values.first_name} autoComplete="given-name" />
        <Field label="Soyad" name="last_name" defaultValue={state.values.last_name} autoComplete="family-name" />
        <Field label="Görünen ad" name="display_name" defaultValue={state.values.display_name} autoComplete="nickname" />
        <Field label="Geçici şifre" name="password" type="password" required defaultValue={state.values.password} error={state.fieldErrors.password} autoComplete="new-password" />
        <label className="block text-sm font-bold">
          Rol
          <Select name="role" defaultValue={state.values.role}>
            <SelectTrigger className="mt-1 h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Üye</SelectItem>
              <SelectItem value="admin">Yönetici</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>

      {state.message ? (
        <p role="alert" aria-live="polite" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
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
    <Button disabled={pending} className="h-10 px-4 text-sm font-bold">
      {pending ? "Kullanıcı ekleniyor..." : "Kullanıcı Ekle"}
    </Button>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  error,
  autoComplete,
}: {
  label: string;
  name: keyof CreateUserFormValues;
  type?: string;
  required?: boolean;
  defaultValue: string;
  error?: string;
  autoComplete?: string;
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
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        autoComplete={autoComplete}
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
