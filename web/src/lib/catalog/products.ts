import { prisma } from "@/lib/db";
import { freshOfferWhere } from "./offers";

const productListInclude = {
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
};

export type ProductWithOffers = Awaited<
  ReturnType<typeof listCategoryProducts>
>[number];

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { children: true, specDefinitions: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function listCategories() {
  return prisma.category.findMany({ where: { parentId: null } });
}

export async function listBrandsInCategory(categoryId: number) {
  return prisma.brand.findMany({
    where: { products: { some: { categoryId } } },
    orderBy: { name: "asc" },
  });
}

export interface CategoryFilters {
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "newest";
  ramGb?: number[];
  storageGb?: number[];
}

export async function listCategoryProducts(
  categoryId: number,
  filters: CategoryFilters = {},
) {
  const specConditions = [
    ...(filters.storageGb?.length
      ? [
          {
            OR: filters.storageGb.map((v) => ({
              attrs: { path: ["storage_gb"], equals: v },
            })),
          },
        ]
      : []),
    ...(filters.ramGb?.length
      ? [
          {
            OR: filters.ramGb.map((v) => ({
              attrs: { path: ["ram_gb"], equals: v },
            })),
          },
        ]
      : []),
  ];

  const products = await prisma.product.findMany({
    where: {
      categoryId,
      ...(filters.brandSlug ? { brand: { slug: filters.brandSlug } } : {}),
      ...(specConditions.length
        ? { variants: { some: { AND: specConditions } } }
        : {}),
    },
    include: productListInclude,
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return applyPriceFilterAndSort(products, filters);
}

/** Distinct RAM/storage values present in a category's variants — drives
 *  which facet chips render. Cheap at catalog scale; cache later if needed. */
export async function getSpecFacets(categoryId: number) {
  const variants = await prisma.productVariant.findMany({
    where: { product: { categoryId } },
    select: { attrs: true },
  });
  const ram = new Set<number>();
  const storage = new Set<number>();
  for (const v of variants) {
    const attrs = (v.attrs ?? {}) as Record<string, unknown>;
    // Plausibility bounds keep mis-parsed values (RAM leaking into storage
    // and vice versa) out of the facet chips. Filtering still works on any
    // value; this only governs which chips are offered.
    if (typeof attrs.ram_gb === "number" && attrs.ram_gb <= 24) {
      ram.add(attrs.ram_gb);
    }
    if (typeof attrs.storage_gb === "number" && attrs.storage_gb >= 32) {
      storage.add(attrs.storage_gb);
    }
  }
  return {
    ramGb: [...ram].sort((a, b) => a - b),
    storageGb: [...storage].sort((a, b) => a - b),
  };
}

export async function listLatestProducts(take = 12) {
  return prisma.product.findMany({
    include: productListInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
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
  });
}

/** Cheapest fresh offer across all variants, or null. */
export function bestPrice(product: {
  variants: { offers: { price: unknown }[] }[];
}): number | null {
  const prices = product.variants
    .flatMap((v) => v.offers)
    .map((o) => Number(o.price));
  return prices.length ? Math.min(...prices) : null;
}

function applyPriceFilterAndSort<
  T extends { variants: { offers: { price: unknown }[] }[] },
>(products: T[], filters: CategoryFilters): T[] {
  let result = products;
  if (filters.minPrice != null || filters.maxPrice != null) {
    result = result.filter((p) => {
      const price = bestPrice(p);
      if (price == null) return false;
      if (filters.minPrice != null && price < filters.minPrice) return false;
      if (filters.maxPrice != null && price > filters.maxPrice) return false;
      return true;
    });
  }
  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const dir = filters.sort === "price_asc" ? 1 : -1;
    result = [...result].sort(
      (a, b) =>
        ((bestPrice(a) ?? Infinity) - (bestPrice(b) ?? Infinity)) * dir,
    );
  }
  return result;
}
