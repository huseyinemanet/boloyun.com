"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { upsertAdminAd, upsertAdminAdSlot } from "@/lib/db-ads";
import { publicRebuildMessage, requestPublicSiteRebuild } from "@/lib/public-site-rebuild";

export type AdSlotFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: {
    name?: string;
    key?: string;
  };
};

export type AdFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: {
    slot_id?: string;
    name?: string;
    ad_code?: string;
    priority?: string;
    show?: string;
    date?: string;
  };
};

export async function saveAdSlotAction(_previousState: AdSlotFormState, formData: FormData): Promise<AdSlotFormState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const fieldErrors: AdSlotFormState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Slot adı gerekli.";
  if (!key) fieldErrors.key = "Slot key gerekli.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Lütfen zorunlu slot alanlarını doldurun.",
      fieldErrors,
    };
  }

  try {
    await upsertAdminAdSlot(formData);
  } catch (error) {
    console.error("Reklam slotu kaydedilemedi.", error);
    return {
      status: "error",
      message: "Reklam slotu kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/ads");
  const rebuild = await requestPublicSiteRebuild(`ad_slot.save:${key}`, admin.id);
  const rebuildMessage = publicRebuildMessage(rebuild);
  return {
    status: "success",
    message: rebuildMessage || "Reklam slotu kaydedildi.",
    fieldErrors: {},
  };
}

export async function saveAdAction(_previousState: AdFormState, formData: FormData): Promise<AdFormState> {
  const admin = await requireAdmin();

  const slotId = String(formData.get("slot_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const adCode = String(formData.get("ad_code") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();
  const startAt = String(formData.get("start_at") ?? "").trim();
  const endAt = String(formData.get("end_at") ?? "").trim();
  const fieldErrors: AdFormState["fieldErrors"] = {};

  if (!slotId) fieldErrors.slot_id = "Slot seçimi gerekli.";
  if (!name) fieldErrors.name = "Reklam adı gerekli.";
  if (!adCode) fieldErrors.ad_code = "Reklam kodu gerekli.";
  if (priority && Number.isNaN(Number(priority))) fieldErrors.priority = "Öncelik sayı olmalı.";
  if (formData.get("show_desktop") !== "on" && formData.get("show_mobile") !== "on") fieldErrors.show = "En az bir gösterim alanı seçilmeli.";
  if (startAt && endAt && new Date(startAt).getTime() > new Date(endAt).getTime()) fieldErrors.date = "Bitiş tarihi başlangıçtan sonra olmalı.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Lütfen reklam formundaki zorunlu alanları kontrol edin.",
      fieldErrors,
    };
  }

  try {
    await upsertAdminAd(formData);
  } catch (error) {
    console.error("Reklam kaydedilemedi.", error);
    return {
      status: "error",
      message: "Reklam kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/oyun/[slug]", "page");
  const rebuild = await requestPublicSiteRebuild(`ad.save:${slotId}`, admin.id);
  const rebuildMessage = publicRebuildMessage(rebuild);
  return {
    status: "success",
    message: rebuildMessage || "Reklam kaydedildi.",
    fieldErrors: {},
  };
}
