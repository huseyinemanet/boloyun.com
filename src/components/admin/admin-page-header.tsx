import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function AdminPageHeader({ title, description, actions, children }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-2 pb-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center">{actions}</div> : null}
    </header>
  );
}
