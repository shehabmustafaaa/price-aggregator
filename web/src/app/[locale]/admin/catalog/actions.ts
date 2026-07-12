"use server";

import { revalidatePath } from "next/cache";
import {
  deleteProduct,
  mergeProducts,
  updateProduct,
} from "@/lib/admin/catalog";

function checkKey(formData: FormData) {
  const key = formData.get("key");
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    throw new Error("unauthorized");
  }
}

export async function updateProductAction(formData: FormData) {
  checkKey(formData);
  await updateProduct(Number(formData.get("productId")), {
    nameEn: String(formData.get("nameEn") || ""),
    nameAr: String(formData.get("nameAr") || ""),
    slug: String(formData.get("slug") || ""),
  });
  revalidatePath("/admin/catalog");
}

export async function deleteProductAction(formData: FormData) {
  checkKey(formData);
  await deleteProduct(Number(formData.get("productId")));
  revalidatePath("/admin/catalog");
}

export async function mergeProductAction(formData: FormData) {
  checkKey(formData);
  await mergeProducts(
    Number(formData.get("productId")),
    Number(formData.get("targetId")),
  );
  revalidatePath("/admin/catalog");
}
