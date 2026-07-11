import { prisma } from "@/lib/db";
import type { RawOffer } from "@/lib/ingest/schema";

export async function listPendingReviews(take = 50) {
  return prisma.matchReview.findMany({
    where: { status: "pending" },
    orderBy: { id: "asc" },
    take,
  });
}

export interface ApproveInput {
  reviewId: number;
  categorySlug: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  brandName?: string;
}

/** Create a canonical product (+variant) from a queued raw offer, then
 *  ingest that offer against it. Also resolves any other pending reviews
 *  from the same store whose titles now match trivially is left to the
 *  next scrape run. */
export async function approveReview(input: ApproveInput) {
  const review = await prisma.matchReview.findUnique({
    where: { id: input.reviewId },
  });
  if (!review || review.status !== "pending") {
    throw new Error("review not found or already handled");
  }
  const category = await prisma.category.findUnique({
    where: { slug: input.categorySlug },
  });
  if (!category) throw new Error(`unknown category ${input.categorySlug}`);

  const raw = review.rawPayload as unknown as RawOffer;

  let brandId: number | null = null;
  const brandName = (input.brandName ?? raw.brand ?? "").trim();
  if (brandName) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(brandName) },
      update: {},
      create: { slug: slugify(brandName), name: brandName },
    });
    brandId = brand.id;
  }

  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      brandId,
      slug: slugify(input.slug),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      images: raw.image_url ? [raw.image_url] : [],
      variants: { create: [{ attrs: raw.attrs ?? {} }] },
    },
    include: { variants: true },
  });

  const now = new Date();
  const offer = await prisma.offer.create({
    data: {
      productVariantId: product.variants[0].id,
      storeId: review.storeId,
      url: raw.url,
      titleRaw: raw.title,
      price: raw.price,
      shippingCost: raw.shipping_cost ?? null,
      currency: raw.currency ?? "EGP",
      inStock: raw.in_stock ?? true,
      condition: raw.condition ?? "NEW",
      warrantyType: raw.warranty_type ?? "UNKNOWN",
      regionVersion: raw.region_version ?? null,
      lastSeenAt: now,
    },
  });
  await prisma.priceHistory.create({
    data: {
      offerId: offer.id,
      price: raw.price,
      shippingCost: raw.shipping_cost ?? null,
      inStock: raw.in_stock ?? true,
    },
  });

  await prisma.matchReview.update({
    where: { id: review.id },
    data: { status: "approved", suggestedProductVariantId: product.variants[0].id },
  });

  return product;
}

export async function rejectReview(reviewId: number) {
  await prisma.matchReview.update({
    where: { id: reviewId },
    data: { status: "rejected" },
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
