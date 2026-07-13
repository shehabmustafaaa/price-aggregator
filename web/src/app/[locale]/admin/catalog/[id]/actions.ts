"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { updateProductFull } from "@/lib/admin/catalog";

export type EditState = { error?: string; ok?: boolean } | undefined;

export async function saveProductAction(
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  try {
    await updateProductFull(id, {
      nameEn: String(formData.get("nameEn") || ""),
      nameAr: String(formData.get("nameAr") || ""),
      slug: String(formData.get("slug") || ""),
      brandName: String(formData.get("brandName") || ""),
      descriptionEn: String(formData.get("descriptionEn") || ""),
      descriptionAr: String(formData.get("descriptionAr") || ""),
      specsJson: String(formData.get("specsJson") || ""),
      imagesText: String(formData.get("imagesText") || ""),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "error" };
  }
  revalidatePath(`/admin/catalog/${id}`);
  return { ok: true };
}

export async function backToCatalog(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  redirect(`/${locale}/admin/catalog`);
}
