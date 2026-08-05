import { prisma } from "@/lib/db";
import { freshOfferWhere } from "./offers";
import { bestPrice } from "./products";
import { buildFeatures } from "./features";

/** Side-by-side comparison assembly. Fetches the selected products (same shape
 *  as getProductBySlug) and turns their per-product feature lists into an
 *  aligned matrix: rows = union of feature labels (first-seen order) + a price
 *  row, each row carrying one value per column and a "differs" flag. All
 *  business logic lives here; the compare page is a thin renderer. */

export const MAX_COMPARE = 4;

const compareInclude = {
  brand: true,
  category: { include: { specDefinitions: { orderBy: { sortOrder: "asc" as const } } } },
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

/** Fetch products for the given slugs: de-duplicated, capped, and returned in
 *  the requested order (missing slugs dropped). */
export async function getProductsForCompare(slugs: string[]) {
  const wanted = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].slice(
    0,
    MAX_COMPARE,
  );
  if (wanted.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { slug: { in: wanted } },
    include: compareInclude,
  });
  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  return wanted.map((s) => bySlug.get(s)).filter((p): p is NonNullable<typeof p> => !!p);
}

export type CompareProduct = Awaited<
  ReturnType<typeof getProductsForCompare>
>[number];

export interface CompareColumn {
  slug: string;
  name: string;
  image: string | null;
  price: number | null;
  storeCount: number;
}

export interface CompareRow {
  label: string;
  values: string[]; // one per column, "" when the placeholder should show
  differs: boolean;
}

export interface Comparison {
  columns: CompareColumn[];
  rows: CompareRow[];
  cheapestIndex: number | null;
}

export function buildComparison(
  products: CompareProduct[],
  locale: string,
  labels: {
    storage: string;
    ram: string;
    network: string;
    colors: string;
    yes: string;
  },
): Comparison {
  const isAr = locale === "ar";

  const columns: CompareColumn[] = products.map((p) => ({
    slug: p.slug,
    name: isAr ? p.nameAr : p.nameEn,
    image: p.images[0] ?? null,
    price: bestPrice(p),
    storeCount: new Set(
      p.variants.flatMap((v) => v.offers.map((o) => o.store.name)),
    ).size,
  }));

  // Per-product feature map (label -> value).
  const perProduct = products.map((p) => {
    const feats = buildFeatures(p, p.category.specDefinitions, locale, labels);
    return new Map(feats.map((f) => [f.label, f.value]));
  });

  // Union of labels, first-seen order across products.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const m of perProduct) {
    for (const label of m.keys()) {
      if (!seen.has(label)) {
        seen.add(label);
        order.push(label);
      }
    }
  }

  const rows: CompareRow[] = order.map((label) => {
    const values = perProduct.map((m) => m.get(label) ?? "");
    const present = values.filter((v) => v !== "");
    const differs =
      present.length > 1 && new Set(present).size > 1
        ? true
        : present.length !== values.length; // a missing value is also a difference
    return { label, values, differs };
  });

  // Cheapest column (lowest best price).
  let cheapestIndex: number | null = null;
  let min = Infinity;
  columns.forEach((c, i) => {
    if (c.price != null && c.price < min) {
      min = c.price;
      cheapestIndex = i;
    }
  });

  return { columns, rows, cheapestIndex };
}
