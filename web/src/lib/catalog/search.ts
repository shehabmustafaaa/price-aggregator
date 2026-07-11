import { prisma } from "@/lib/db";
import { freshOfferWhere } from "./offers";

/** Single entry point for product search (guardrail #12).
 *  Backed by Postgres for now; swapping to Meilisearch changes only this module. */
export async function searchProducts(query: string, locale: string) {
  const q = query.trim();
  if (!q) return [];

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
        { modelNumber: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      brand: true,
      variants: {
        include: {
          offers: {
            where: freshOfferWhere(),
            include: { store: true },
            orderBy: { price: "asc" as const },
          },
        },
      },
    },
    take: 40,
  });

  if (products.length === 0) {
    // Micro-feature: no-results capture drives what to add next.
    await prisma.missedSearch.create({ data: { query: q, locale } });
  }

  return products;
}
