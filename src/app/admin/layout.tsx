import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminShellSkeleton } from "@/components/admin/admin-shell-skeleton";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<AdminShellSkeleton />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </>
  );
}
