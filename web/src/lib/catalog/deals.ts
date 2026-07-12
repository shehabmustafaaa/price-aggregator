import { prisma } from "@/lib/db";

export interface PriceDropRow {
  productId: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  images: string[];
  storeName: string;
  currentPrice: number;
  wasPrice: number;
  dropPct: number;
}

/** Biggest recent price drops: each fresh offer whose current price is
 *  below its own 30-day high, ranked by drop %. Requires accumulated
 *  price history to be meaningful. */
export async function getPriceDrops(limit = 40): Promise<PriceDropRow[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      p.id            AS "productId",
      p.slug          AS "slug",
      p.name_en       AS "nameEn",
      p.name_ar       AS "nameAr",
      p.images        AS "images",
      s.name          AS "storeName",
      o.price         AS "currentPrice",
      ph.max_price    AS "wasPrice"
    FROM offers o
    JOIN product_variants v ON v.id = o.product_variant_id
    JOIN products p ON p.id = v.product_id
    JOIN stores s ON s.id = o.store_id
    JOIN LATERAL (
      SELECT MAX(price) AS max_price
      FROM price_history ph
      WHERE ph.offer_id = o.id
        AND ph.recorded_at >= now() - interval '30 days'
    ) ph ON true
    WHERE o.last_seen_at >= now() - interval '24 hours'
      AND s.active = true
      AND ph.max_price > o.price * 1.03
    ORDER BY (ph.max_price - o.price) / ph.max_price DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => {
    const current = Number(r.currentPrice);
    const was = Number(r.wasPrice);
    return {
      productId: Number(r.productId),
      slug: String(r.slug),
      nameEn: String(r.nameEn),
      nameAr: String(r.nameAr),
      images: (r.images as string[]) ?? [],
      storeName: String(r.storeName),
      currentPrice: current,
      wasPrice: was,
      dropPct: Math.round((1 - current / was) * 100),
    };
  });
}

export interface DealRow {
  productId: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  images: string[];
  minPrice: number;
  maxPrice: number;
  storeCount: number;
  savePct: number;
}

// Spreads above this are almost always a data artifact (different config
// collapsed onto one product — see variant-granularity note in deals.ts),
// not a real deal. Excluded to protect trust until matching splits configs.
const MAX_PLAUSIBLE_SPREAD = 0.45;

/** Biggest cross-store spreads, grouped by product + STORAGE (from offer
 *  attrs) so the comparison is closer to like-for-like than the coarse
 *  variant id, then deduped to the best spread per product. Implausible
 *  spreads are dropped. Real fix is finer variant granularity in matching. */
export async function getBestDeals(limit = 40): Promise<DealRow[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      p.id       AS "productId",
      p.slug     AS "slug",
      p.name_en  AS "nameEn",
      p.name_ar  AS "nameAr",
      p.images   AS "images",
      MIN(o.price) AS "minPrice",
      MAX(o.price) AS "maxPrice",
      COUNT(DISTINCT o.store_id) AS "storeCount"
    FROM offers o
    JOIN product_variants v ON v.id = o.product_variant_id
    JOIN products p ON p.id = v.product_id
    JOIN stores s ON s.id = o.store_id
    WHERE o.last_seen_at >= now() - interval '24 hours'
      AND s.active = true
    GROUP BY p.id, COALESCE(o.attrs->>'storage_gb', 'na')
    HAVING COUNT(DISTINCT o.store_id) >= 2
       AND (MAX(o.price) - MIN(o.price)) / MAX(o.price) < ${MAX_PLAUSIBLE_SPREAD}
    ORDER BY (MAX(o.price) - MIN(o.price)) / MAX(o.price) DESC
    LIMIT ${limit * 3}
  `;

  const seen = new Set<number>();
  const deals: DealRow[] = [];
  for (const r of rows) {
    const productId = Number(r.productId);
    if (seen.has(productId)) continue; // keep only best-spread variant per product
    seen.add(productId);
    const min = Number(r.minPrice);
    const max = Number(r.maxPrice);
    deals.push({
      productId,
      slug: String(r.slug),
      nameEn: String(r.nameEn),
      nameAr: String(r.nameAr),
      images: (r.images as string[]) ?? [],
      minPrice: min,
      maxPrice: max,
      storeCount: Number(r.storeCount),
      savePct: Math.round((1 - min / max) * 100),
    });
    if (deals.length >= limit) break;
  }
  return deals;
}
