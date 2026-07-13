"use client";

import type { FormEvent, ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Input } from "@/components/ui/input";

type ValidatedAuthFormProps = {
  action: string;
  className?: string;
  children: ReactNode;
};

const InvalidFieldsContext = createContext<Set<string> | null>(null);

export function ValidatedAuthForm({ action, className, children }: ValidatedAuthFormProps) {
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  function markInvalid(fieldName: string) {
    if (!fieldName) return;
    setInvalidFields((current) => new Set(current).add(fieldName));
  }

  function clearIfValid(target: EventTarget & HTMLInputElement) {
    if (!target.name || !target.validity.valid) return;
    setInvalidFields((current) => {
      if (!current.has(target.name)) return current;
      const nextFields = new Set(current);
      nextFields.delete(target.name);
      return nextFields;
    });
  }

  return (
    <form
      action={action}
      method="post"
      className={className}
      onInvalidCapture={(event: FormEvent<HTMLFormElement>) => {
        const target = event.target;
        if (target instanceof HTMLInputElement) markInvalid(target.name);
      }}
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement) clearIfValid(target);
      }}
    >
      <InvalidFieldsProvider invalidFields={invalidFields}>{children}</InvalidFieldsProvider>
    </form>
  );
}

function InvalidFieldsProvider({ invalidFields, children }: { invalidFields: Set<string>; children: ReactNode }) {
  return <InvalidFieldsContext.Provider value={invalidFields}>{children}</InvalidFieldsContext.Provider>;
}

type ValidatedInputProps = React.ComponentProps<typeof Input> & {
  serverInvalid?: boolean;
};

export function ValidatedInput({ name, serverInvalid = false, "aria-invalid": ariaInvalid, ...props }: ValidatedInputProps) {
  const invalidFields = useContext(InvalidFieldsContext);
  const fieldName = typeof name === "string" ? name : "";
  const isInvalid = Boolean(ariaInvalid) || serverInvalid || (fieldName ? invalidFields?.has(fieldName) : false);

  return <Input name={name} aria-invalid={isInvalid} {...props} />;
}
