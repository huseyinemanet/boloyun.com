import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center px-3 py-8 md:py-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-[1fr_0.82fr]">
            <div className="p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              {children}
            </div>
            <div className="relative hidden border-l border-border bg-muted/30 md:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary),transparent_70%),transparent_34%),linear-gradient(135deg,color-mix(in_oklch,var(--card),var(--primary)_8%),var(--background))]" />
              <div className="relative flex h-full min-h-96 flex-col justify-end p-8">
                <p className="text-3xl font-semibold tracking-tight text-foreground">Bol Oyun</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Favoriler, yorumlar ve son oynanan oyunlar tek hesapta kalır.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {footer ? <div className="mt-4 px-6 text-center text-xs leading-5 text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}

export function AuthMessage({ id, type, children }: { id?: string; type: "success" | "error"; children: ReactNode }) {
  return (
    <p
      id={id}
      role={type === "error" ? "alert" : "status"}
      className={`mb-4 rounded-md p-3 text-sm font-semibold ${type === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
    >
      {children}
    </p>
  );
}
