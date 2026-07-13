import * as React from "react";

import { cn } from "@/lib/utils";

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "group/field grid gap-2",
        orientation === "horizontal" && "flex items-start gap-3 rounded-md border border-border bg-card p-3",
        className
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("grid gap-4", className)} {...props} />;
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-content" className={cn("grid min-w-0 gap-0.5", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="field-label" className={cn("text-sm font-bold leading-none", className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-xs leading-5 text-muted-foreground", className)} {...props} />;
}

function FieldSeparator({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-separator"
      className={cn("flex items-center gap-3 text-xs font-bold text-muted-foreground", className)}
      {...props}
    >
      <span className="h-px flex-1 bg-border" />
      {children ? <span data-slot="field-separator-content">{children}</span> : null}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator };
