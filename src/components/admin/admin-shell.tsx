import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";

export async function AdminShell({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <main id="main-content" className="mx-auto w-full px-3 py-3 md:px-4">
      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <AdminSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
