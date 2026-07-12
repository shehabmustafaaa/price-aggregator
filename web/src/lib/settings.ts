import { prisma } from "@/lib/db";

/** Global settings. Auto-approve is ON by default: unmatched offers create
 *  products automatically instead of waiting in the review queue. Disable
 *  from /admin/scraper when curation is preferred. */
export const AUTO_APPROVE_KEY = "ingest.auto_approve";

export async function getBoolSetting(
  key: string,
  defaultValue: boolean,
): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return defaultValue;
  return row.value === "true";
}

export async function setBoolSetting(key: string, value: boolean) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}
