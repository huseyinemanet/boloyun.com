import { redirect } from "next/navigation";
import { adminPageMetadata } from "@/lib/seo/metadata";

export const metadata = adminPageMetadata("Admin Girişi");

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const { next = "/admin" } = await searchParams;
  redirect(`/giris?next=${encodeURIComponent(next)}`);
}
