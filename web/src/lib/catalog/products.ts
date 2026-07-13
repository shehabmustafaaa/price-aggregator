import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
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
} satisfies Prisma.ProductInclude;

export type ProductWithOffers = Prisma.ProductGetPayload<{
  include: typeof productListInclude;
}>;

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

export interface PagedProducts {
  items: ProductWithOffers[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const CATEGORY_PAGE_SIZE = 24;

export async function listCategoryProducts(
  categoryId: number,
  filters: CategoryFilters = {},
  page = 1,
  pageSize = CATEGORY_PAGE_SIZE,
): Promise<PagedProducts> {
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

  // Fetch all products matching brand/spec filters, then price-filter, sort,
  // and paginate in JS — price is derived from offers, not a column, so it
  // can't be ordered/limited at the DB level. Fine at catalog scale.
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
    take: 2000,
  });

  const filtered = applyPriceFilterAndSort(products, filters);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: current,
    pageSize,
    totalPages,
  };
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

export const HOME_PAGE_SIZE = 24;

export async function listLatestProducts(
  page = 1,
  pageSize = HOME_PAGE_SIZE,
): Promise<PagedProducts> {
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      include: productListInclude,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    total,
    page: Math.min(Math.max(1, page), totalPages),
    pageSize,
    totalPages,
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: { include: { specDefinitions: { orderBy: { sortOrder: "asc" } } } },
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

/** Similar products: same brand first, then same category, with fresh offers
 *  preferred. Excludes the current product. */
export async function getSimilarProducts(
  product: { id: number; categoryId: number; brandId: number | null },
  take = 8,
) {
  const candidates = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    include: productListInclude,
    take: 60,
  });
  const sameBrand = candidates.filter((c) => c.brandId === product.brandId);
  const others = candidates.filter((c) => c.brandId !== product.brandId);
  const ordered = [...sameBrand, ...others].sort(
    (a, b) => Number(bestPrice(b) != null) - Number(bestPrice(a) != null),
  );
  return ordered.slice(0, take);
}

export async function getProductByIdAdmin(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: { brand: true, category: true },
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
