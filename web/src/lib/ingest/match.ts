import { prisma } from "@/lib/db";
import type { RawOffer } from "./schema";

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
    // listing, and qualifier words (Pro/Max/Ultra/برو/…) must agree.
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

/** Normalize Arabic orthography so spelling variants compare equal:
 *  alef forms (أ إ آ ا), taa marbuta (ة/ه), alef maqsura (ى/ي),
 *  tatweel and diacritics. "ألترا" and "الترا" must match. */
function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, "") // diacritics
    .replace(/ـ/g, "") // tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeArabic(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}+]+/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

/** Fraction of the product-name tokens found in the raw listing title. */
function overlapScore(rawTokens: Set<string>, nameTokens: Set<string>): number {
  if (nameTokens.size === 0) return 0;
  let hits = 0;
  for (const t of nameTokens) if (rawTokens.has(t)) hits++;
  return hits / nameTokens.size;
}

/** Every token of the product name that contains a digit (a56, s25, 14…)
 *  must literally appear in the raw listing title. */
function hasAllModelTokens(
  rawTokens: Set<string>,
  nameTokens: Set<string>,
): boolean {
  for (const t of nameTokens) {
    if (/\d/.test(t) && !rawTokens.has(t)) return false;
  }
  return true;
}

const QUALIFIERS = new Set([
  "pro", "max", "ultra", "plus", "mini", "lite", "fe", "note", "edge",
  "برو", "ماكس", "الترا", "بلس", "ميني", "لايت", "نوت",
]);

/** "iPhone 16" must not swallow "iPhone 16 Pro": the qualifier sets of
 *  the listing and the product name must be identical. */
function qualifiersMatch(
  rawTokens: Set<string>,
  nameTokens: Set<string>,
): boolean {
  for (const q of QUALIFIERS) {
    if (rawTokens.has(q) !== nameTokens.has(q)) return false;
  }
  return true;
}

function sameBrand(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
