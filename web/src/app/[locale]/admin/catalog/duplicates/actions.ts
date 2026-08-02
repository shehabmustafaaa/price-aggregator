"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { mergeProducts } from "@/lib/admin/catalog";
import { dismissDuplicatePair } from "@/lib/admin/duplicates";

/** Merge a suggested pair: absorbed product folds into the survivor (existing
 *  transactional merge). Swallows a missing-product error so a pair another
 *  action already resolved just reflects current state on reload. */
export async function mergeAction(formData: FormData) {
  if (!(await getAdminUser())) return;
  const survivorId = Number(formData.get("survivorId"));
  const absorbedId = Number(formData.get("absorbedId"));
  if (!Number.isInteger(survivorId) || !Number.isInteger(absorbedId)) return;
  try {
    await mergeProducts(absorbedId, survivorId);
  } catch (err) {
    if (!(err instanceof Error && err.message === "product not found")) throw err;
  }
  revalidatePath("/admin/catalog/duplicates");
}

/** Dismiss a suggested pair as "not a duplicate" (persists). */
export async function dismissAction(formData: FormData) {
  if (!(await getAdminUser())) return;
  const aId = Number(formData.get("aId"));
  const bId = Number(formData.get("bId"));
  if (!Number.isInteger(aId) || !Number.isInteger(bId)) return;
  await dismissDuplicatePair(aId, bId);
  revalidatePath("/admin/catalog/duplicates");
}
