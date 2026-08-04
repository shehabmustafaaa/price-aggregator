import { prisma } from "@/lib/db";

/** Editorial name-cleanup helper. Auto-created products (autoCreateProduct)
 *  seed nameEn = nameAr = the scraped base title, which for Dream2000/B.TECH is
 *  Arabic — so the English name renders as Arabic. We flag exactly those:
 *  products whose English name contains any Arabic character. Once an admin
 *  gives it a Latin English name it no longer matches, so it drops off the
 *  list with no separate "dismissed" state. */

// Arabic block, Arabic Supplement, Presentation Forms A/B.
export const ARABIC_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export function nameNeedsCleanup(nameEn: string): boolean {
  return ARABIC_RE.test(nameEn);
}

export interface NeedsNameProduct {
  id: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  image: string | null;
  brandName: string | null;
  offerCount: number;
  variantCount: number;
}

export async function listProductsNeedingNames(
  take = 100,
): Promise<NeedsNameProduct[]> {
  // Catalog is a few hundred rows — cheaper and DB-agnostic to filter the
  // Arabic-in-English flag in app code than to push a Unicode regex to SQL.
  const products = await prisma.product.findMany({
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      images: true,
      brand: { select: { name: true } },
      variants: { select: { _count: { select: { offers: true } } } },
    },
    orderBy: { id: "desc" },
  });

  const out: NeedsNameProduct[] = [];
  for (const p of products) {
    if (!nameNeedsCleanup(p.nameEn)) continue;
    out.push({
      id: p.id,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      slug: p.slug,
      image: p.images[0] ?? null,
      brandName: p.brand?.name ?? null,
      offerCount: p.variants.reduce((sum, v) => sum + v._count.offers, 0),
      variantCount: p.variants.length,
    });
    if (out.length >= take) break;
  }
  return out;
}
