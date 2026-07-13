"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { requestRun, updateStoreScrapeConfig } from "@/lib/scraper/jobs";
import { AUTO_APPROVE_KEY, setBoolSetting } from "@/lib/settings";

export async function toggleAutoApproveAction(formData: FormData) {
  await requireAdmin();
  await setBoolSetting(AUTO_APPROVE_KEY, formData.get("autoApprove") === "on");
  revalidatePath("/admin/scraper");
}

export async function runNowAction(formData: FormData) {
  await requireAdmin();
  await requestRun(Number(formData.get("storeId")));
  revalidatePath("/admin/scraper");
}

export async function updateConfigAction(formData: FormData) {
  await requireAdmin();
  await updateStoreScrapeConfig(Number(formData.get("storeId")), {
    scrapeEnabled: formData.get("scrapeEnabled") === "on",
    scrapeIntervalMinutes: Number(formData.get("intervalMinutes")) || 360,
    requestDelaySeconds: Number(formData.get("delaySeconds")) || 5,
  });
  revalidatePath("/admin/scraper");
}
