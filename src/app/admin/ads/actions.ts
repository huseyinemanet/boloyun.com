"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { upsertAdminAd, upsertAdminAdSlot } from "@/lib/db-ads";

export async function saveAdSlotAction(formData: FormData) {
  await requireAdmin();
  await upsertAdminAdSlot(formData);
  revalidatePath("/admin/ads");
}

export async function saveAdAction(formData: FormData) {
  await requireAdmin();
  await upsertAdminAd(formData);
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/oyun/[slug]", "page");
}
