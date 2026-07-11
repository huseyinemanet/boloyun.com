import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <main className="mx-auto w-full px-3 py-3 md:px-4">
      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <AdminSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
import type { Metadata } from "next";
