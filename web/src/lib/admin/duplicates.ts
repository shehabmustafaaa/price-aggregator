import { prisma } from "@/lib/db";
import { scoreProductPair } from "@/lib/ingest/similarity";

// Re-export so existing callers/tests can import it from here too.
export { scoreProductPair };

/** A product as compared/displayed on the duplicates page. */
export interface DupProduct {
  id: number;
  nameEn: string;
  nameAr: string;
  brandName: string | null;
  image: string | null;
  offerCount: number;
  variantCount: number;
}

export interface DuplicateCandidate {
  a: DupProduct;
  b: DupProduct;
  score: number;
}

/** Pairs scoring at/above this are shown — matches the ingest matcher's
 *  confidence cutoff so the list stays high-precision. */
const SCORE_THRESHOLD = 0.6;
/** Defensive cap: skip absurdly large brand groups (keeps O(k²) bounded). */
const MAX_GROUP = 300;

/** Compute ranked likely-duplicate pairs. Comparison is within
 *  (category, brand) groups only (SC-005 + brand agreement), dismissed pairs
 *  are excluded, and the top `limit` by score are returned. Read-only. */
export async function findDuplicateCandidates(
  limit = 100,
): Promise<DuplicateCandidate[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      categoryId: true,
      brandId: true,
      nameEn: true,
      nameAr: true,
      images: true,
      brand: { select: { name: true } },
      _count: { select: { variants: true } },
      variants: { select: { _count: { select: { offers: true } } } },
    },
  });

  const dismissed = await prisma.duplicateDismissal.findMany({
    select: { productLoId: true, productHiId: true },
  });
  const dismissedKeys = new Set(
    dismissed.map((d) => `${d.productLoId}:${d.productHiId}`),
  );

  // Group by (category, brand) — brandId null is its own group.
  const groups = new Map<string, DupProduct[]>();
  for (const p of products) {
    const key = `${p.categoryId}:${p.brandId ?? "none"}`;
    const dp: DupProduct = {
      id: p.id,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      brandName: p.brand?.name ?? null,
      image: p.images[0] ?? null,
      offerCount: p.variants.reduce((n, v) => n + v._count.offers, 0),
      variantCount: p._count.variants,
    };
    const list = groups.get(key);
    if (list) list.push(dp);
    else groups.set(key, [dp]);
  }

  const candidates: DuplicateCandidate[] = [];
  for (const list of groups.values()) {
    if (list.length < 2 || list.length > MAX_GROUP) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const lo = Math.min(a.id, b.id);
        const hi = Math.max(a.id, b.id);
        if (dismissedKeys.has(`${lo}:${hi}`)) continue;
        const score = scoreProductPair(a, b);
        if (score >= SCORE_THRESHOLD) {
          // Present the lower id first for a stable A/B ordering.
          candidates.push(
            a.id === lo ? { a, b, score } : { a: b, b: a, score },
          );
        }
      }
    }
  }

  candidates.sort((x, y) => y.score - x.score);
  return candidates.slice(0, limit);
}

/** Persist a "not a duplicate" decision for the unordered pair (FR-005/FR-006).
 *  Idempotent; never throws on a repeat dismissal. */
export async function dismissDuplicatePair(
  idA: number,
  idB: number,
): Promise<void> {
  if (idA === idB) return;
  const productLoId = Math.min(idA, idB);
  const productHiId = Math.max(idA, idB);
  await prisma.duplicateDismissal.upsert({
    where: { productLoId_productHiId: { productLoId, productHiId } },
    create: { productLoId, productHiId },
    update: {},
  });
}
