"use server";

import { revalidatePath } from "next/cache";
import { approveReview, rejectReview } from "@/lib/admin/review";

function checkKey(formData: FormData) {
  const key = formData.get("key");
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    throw new Error("unauthorized");
  }
}

export async function approveAction(formData: FormData) {
  checkKey(formData);
  await approveReview({
    reviewId: Number(formData.get("reviewId")),
    categorySlug: String(formData.get("categorySlug") || "mobile-phones"),
    slug: String(formData.get("slug") || ""),
    nameEn: String(formData.get("nameEn") || ""),
    nameAr: String(formData.get("nameAr") || ""),
    brandName: String(formData.get("brandName") || "") || undefined,
  });
  revalidatePath("/admin/review");
}

export async function rejectAction(formData: FormData) {
  checkKey(formData);
  await rejectReview(Number(formData.get("reviewId")));
  revalidatePath("/admin/review");
}
