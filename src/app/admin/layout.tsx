import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminShellSkeleton } from "@/components/admin/admin-shell-skeleton";
import { requireAdmin } from "@/lib/auth";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AuthenticatedAdminShell>{children}</AuthenticatedAdminShell>
    </Suspense>
  );
}

async function AuthenticatedAdminShell({ children }: { children: ReactNode }) {
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
