"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type AdminCheckboxFieldProps = React.ComponentProps<typeof Checkbox> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  fieldClassName?: string;
};

function AdminCheckboxField({
  id,
  label,
  description,
  fieldClassName,
  className,
  ...props
}: AdminCheckboxFieldProps) {
  const generatedId = React.useId();
  const checkboxId = id ?? generatedId;

  return (
    <Field
      orientation="horizontal"
      className={cn("cursor-pointer items-center rounded-none border-0 bg-transparent p-0 shadow-none", fieldClassName)}
    >
      <Checkbox id={checkboxId} className={className} {...props} />
      <FieldContent>
        <FieldLabel htmlFor={checkboxId} className="font-normal leading-5">{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
    </Field>
  );
}

export { AdminCheckboxField };
