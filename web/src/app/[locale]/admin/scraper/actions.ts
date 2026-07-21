"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { requestRun, updateStoreScrapeConfig } from "@/lib/scraper/jobs";
import { AUTO_APPROVE_KEY, setBoolSetting } from "@/lib/settings";

/** One Save for the whole panel: auto-approve + every store's config.
 *  Redirects afterwards (POST→redirect→GET) so a page refresh never
 *  re-submits the form ("Confirm Form Resubmission" dialog). */
export async function saveAllAction(formData: FormData) {
  await requireAdmin();
  const locale = String(formData.get("locale") || "en");

  await setBoolSetting(AUTO_APPROVE_KEY, formData.get("autoApprove") === "on");

  const ids = String(formData.get("storeIds") || "")
    .split(",")
    .map(Number)
    .filter(Boolean);
  for (const id of ids) {
    await updateStoreScrapeConfig(id, {
      scrapeEnabled: formData.get(`enabled_${id}`) === "on",
      scrapeIntervalMinutes: Number(formData.get(`interval_${id}`)) || 360,
      requestDelaySeconds: Number(formData.get(`delay_${id}`)) || 5,
    });
  }
  redirect(`/${locale}/admin/scraper?saved=1`);
}

export async function runNowAction(formData: FormData) {
  await requireAdmin();
  const locale = String(formData.get("locale") || "en");
  await requestRun(Number(formData.get("storeId")));
  redirect(`/${locale}/admin/scraper?queued=1`);
}
