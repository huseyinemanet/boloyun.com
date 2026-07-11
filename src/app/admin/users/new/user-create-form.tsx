"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type AdminUserCreateFieldErrors,
  type AdminUserCreateValues,
  normalizeAdminUserCreateRole,
  validateAdminUserCreateValues,
} from "@/lib/admin-user-create-validation";

type FormState = {
  message: string;
  fieldErrors: AdminUserCreateFieldErrors;
  values: AdminUserCreateValues;
};

const initialState: FormState = {
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
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: AdminUserCreateValues = {
      username: String(formData.get("username") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      first_name: String(formData.get("first_name") ?? "").trim(),
      last_name: String(formData.get("last_name") ?? "").trim(),
      display_name: String(formData.get("display_name") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      role: normalizeAdminUserCreateRole(String(formData.get("role") ?? "member")),
    };
    const fieldErrors = validateAdminUserCreateValues(values);

    if (Object.keys(fieldErrors).length) {
      setState({ message: "Lütfen işaretli alanları kontrol edin.", fieldErrors, values });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        router.push("/admin/users");
        router.refresh();
        return;
      }

      const result = await response.json().catch(() => null) as Partial<FormState> | null;
      setState({
        message: result?.message || "Kullanıcı oluşturulamadı.",
        fieldErrors: result?.fieldErrors ?? {},
        values: result?.values ?? values,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4 rounded-md border border-border bg-card p-4">
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

      <Button disabled={isPending} className="h-10 px-4 text-sm font-bold">
        {isPending ? "Kullanıcı ekleniyor..." : "Kullanıcı Ekle"}
      </Button>
    </form>
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
  name: keyof AdminUserCreateValues;
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
