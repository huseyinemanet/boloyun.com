import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
