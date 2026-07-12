"use server";

import { revalidatePath } from "next/cache";
import { requestRun, updateStoreScrapeConfig } from "@/lib/scraper/jobs";

function checkKey(formData: FormData) {
  const key = formData.get("key");
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    throw new Error("unauthorized");
  }
}

export async function runNowAction(formData: FormData) {
  checkKey(formData);
  await requestRun(Number(formData.get("storeId")));
  revalidatePath("/admin/scraper");
}

export async function updateConfigAction(formData: FormData) {
  checkKey(formData);
  await updateStoreScrapeConfig(Number(formData.get("storeId")), {
    scrapeEnabled: formData.get("scrapeEnabled") === "on",
    scrapeIntervalMinutes: Number(formData.get("intervalMinutes")) || 360,
    requestDelaySeconds: Number(formData.get("delaySeconds")) || 5,
  });
  revalidatePath("/admin/scraper");
}
