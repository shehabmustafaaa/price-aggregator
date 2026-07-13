"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { approveReview, rejectReview } from "@/lib/admin/review";

export async function approveAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  await rejectReview(Number(formData.get("reviewId")));
  revalidatePath("/admin/review");
}
