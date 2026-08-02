import { prisma } from "@/lib/db";
import type { RawOffer } from "./schema";
import {
  tokenize,
  overlapScore,
  hasAllModelTokens,
  qualifiersMatch,
  sameBrand,
} from "./similarity";

export interface MatchResult {
  productId: number | null;
  confidence: number;
}

const CONFIDENCE_THRESHOLD = 0.6;

/** Map a scraped offer to a canonical PRODUCT (variant resolution happens
 *  separately, in resolveVariant). Strategy: exact model number → normalized
 *  token overlap with digit-token and qualifier guards → review queue. */
export async function matchOffer(
  raw: RawOffer,
  categoryId: number,
): Promise<MatchResult> {
  // 1) Exact model-number match
  if (raw.model_number) {
    const byModel = await prisma.product.findFirst({
      where: {
        categoryId,
        modelNumber: { equals: raw.model_number, mode: "insensitive" },
      },
    });
    if (byModel) {
      return { productId: byModel.id, confidence: 1 };
    }
  }

  // 2) Token-overlap match against product names
  const candidates = await prisma.product.findMany({
    where: { categoryId },
    include: { brand: true },
  });

  const rawTokens = tokenize(raw.title);
  let best: { productId: number; score: number } | null = null;

  for (const product of candidates) {
    if (
      raw.brand &&
      product.brand &&
      !sameBrand(raw.brand, product.brand.name)
    ) {
      continue;
    }
    // Stores list in Arabic, English, or a mix — score against both names.
    const tokensEn = tokenize(`${product.brand?.name ?? ""} ${product.nameEn}`);
    const tokensAr = tokenize(product.nameAr);

    // Phone names live in their digit tokens (A17 vs A56, 14 vs 13):
    // every digit-bearing token of the product name must appear in the
    // listing, and qualifier words (Pro/Max/Ultra/…) must agree.
    const nameOk = (nameTokens: Set<string>) =>
      hasAllModelTokens(rawTokens, nameTokens) &&
      qualifiersMatch(rawTokens, nameTokens);

    const scoreEn = nameOk(tokensEn) ? overlapScore(rawTokens, tokensEn) : 0;
    const scoreAr = nameOk(tokensAr) ? overlapScore(rawTokens, tokensAr) : 0;
    const score = Math.max(scoreEn, scoreAr);
    if (!best || score > best.score) {
      best = { productId: product.id, score };
    }
  }

  if (best && best.score >= CONFIDENCE_THRESHOLD) {
    return { productId: best.productId, confidence: best.score };
  }
  return { productId: null, confidence: best?.score ?? 0 };
}
