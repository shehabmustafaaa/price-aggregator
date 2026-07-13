"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import {
  deleteProduct,
  mergeProducts,
  updateProduct,
} from "@/lib/admin/catalog";

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  await updateProduct(Number(formData.get("productId")), {
    nameEn: String(formData.get("nameEn") || ""),
    nameAr: String(formData.get("nameAr") || ""),
    slug: String(formData.get("slug") || ""),
  });
  revalidatePath("/admin/catalog");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  await deleteProduct(Number(formData.get("productId")));
  revalidatePath("/admin/catalog");
}

export async function mergeProductAction(formData: FormData) {
  await requireAdmin();
  await mergeProducts(
    Number(formData.get("productId")),
    Number(formData.get("targetId")),
  );
  revalidatePath("/admin/catalog");
}
