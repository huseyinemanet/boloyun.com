"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";

type LoginFormProps = {
  next: string;
  challenge: boolean;
  hasServerFieldError: boolean;
};

export function LoginForm({ next, challenge, hasServerFieldError }: LoginFormProps) {
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  function markInvalid(fieldName: string) {
    if (fieldName !== "email" && fieldName !== "password") return;
    setInvalidFields((current) => new Set(current).add(fieldName));
  }

  function clearIfValid(field: HTMLInputElement) {
    if (field.name !== "email" && field.name !== "password") return;
    if (!field.validity.valid) return;
    setInvalidFields((current) => {
      if (!current.has(field.name)) return current;
      const nextFields = new Set(current);
      nextFields.delete(field.name);
      return nextFields;
    });
  }

  const hasEmailError = hasServerFieldError || invalidFields.has("email");
  const hasPasswordError = hasServerFieldError || invalidFields.has("password");
  const errorDescription = hasServerFieldError ? "login-form-error" : undefined;

  return (
    <form
      action="/auth/signin"
      method="post"
      className="space-y-3"
      onInvalidCapture={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement) markInvalid(target.name);
      }}
    >
      <BotProtectionFields challenge={challenge} action="login" />
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-bold">
        E-posta
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={hasEmailError}
          aria-describedby={errorDescription}
          className="mt-1 h-10"
          onChange={(event) => clearIfValid(event.currentTarget)}
        />
      </label>
      <label className="block text-sm font-bold">
        Şifre
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={hasPasswordError}
          aria-describedby={errorDescription}
          className="mt-1 h-10"
          onChange={(event) => clearIfValid(event.currentTarget)}
        />
      </label>
      <Button className="h-10 w-full px-4 text-sm font-black">Giriş Yap</Button>
    </form>
  );
}
