"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { updateProduct } from "@/lib/admin/catalog";

/** Save cleaned names/slug for one product (reuses the catalog updateProduct,
 *  which trims). A product leaves the needs-names list automatically once its
 *  English name no longer contains Arabic. */
export async function fixNamesAction(formData: FormData) {
  if (!(await getAdminUser())) return;
  const productId = Number(formData.get("productId"));
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameAr = String(formData.get("nameAr") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!Number.isInteger(productId) || !nameEn || !nameAr || !slug) return;

  await updateProduct(productId, { nameEn, nameAr, slug });
  revalidatePath("/admin/catalog/needs-names");
}
