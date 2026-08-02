/** Pure name-similarity primitives shared by the ingest matcher
 *  (offer→product, `match.ts`) and duplicate detection (product→product,
 *  `lib/admin/duplicates.ts`). No DB access — string/token logic only. */

/** Normalize Arabic orthography so spelling variants compare equal:
 *  alef forms (أ إ آ ا), taa marbuta (ة/ه), alef maqsura (ى/ي),
 *  tatweel and diacritics. "ألترا" and "الترا" must match. */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, "") // diacritics
    .replace(/ـ/g, "") // tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

export function tokenize(text: string): Set<string> {
  return new Set(
    normalizeArabic(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}+]+/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

/** Fraction of the `nameTokens` found in `rawTokens`. */
export function overlapScore(
  rawTokens: Set<string>,
  nameTokens: Set<string>,
): number {
  if (nameTokens.size === 0) return 0;
  let hits = 0;
  for (const t of nameTokens) if (rawTokens.has(t)) hits++;
  return hits / nameTokens.size;
}

/** Every token of the product name that contains a digit (a56, s25, 14…)
 *  must literally appear in the raw token set. */
export function hasAllModelTokens(
  rawTokens: Set<string>,
  nameTokens: Set<string>,
): boolean {
  for (const t of nameTokens) {
    if (/\d/.test(t) && !rawTokens.has(t)) return false;
  }
  return true;
}

export const QUALIFIERS = new Set([
  "pro", "max", "ultra", "plus", "mini", "lite", "fe", "note", "edge",
  "برو", "ماكس", "الترا", "بلس", "ميني", "لايت", "نوت",
]);

/** "iPhone 16" must not swallow "iPhone 16 Pro": the qualifier sets of
 *  the two token sets must be identical. */
export function qualifiersMatch(
  rawTokens: Set<string>,
  nameTokens: Set<string>,
): boolean {
  for (const q of QUALIFIERS) {
    if (rawTokens.has(q) !== nameTokens.has(q)) return false;
  }
  return true;
}

export function sameBrand(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Minimal product shape needed to score a pair for duplicate detection. */
export interface ScorableProduct {
  nameEn: string;
  nameAr: string;
  brandName: string | null;
}

/** Brand-gated name similarity between two products, mirroring the ingest
 *  matcher (offer→product) but symmetrized: it tries each product as the
 *  canonical "name" and the other as the noisier "listing" and takes the max,
 *  so extra tokens on one side (e.g. "5G", storage) don't sink a real
 *  duplicate, while the digit-token + qualifier guards still keep "A56" ≠
 *  "A17" and "16" ≠ "16 Pro" apart. Best of EN/AR. Brand agreement is enforced
 *  by the caller's grouping, so it isn't re-checked here. Pure — no DB. */
export function scoreProductPair(a: ScorableProduct, b: ScorableProduct): number {
  const aEn = tokenize(`${a.brandName ?? ""} ${a.nameEn}`);
  const bEn = tokenize(`${b.brandName ?? ""} ${b.nameEn}`);
  const aAr = tokenize(a.nameAr);
  const bAr = tokenize(b.nameAr);

  // dir(listing, name): every digit-bearing token of `name` must appear in
  // `listing` and qualifiers must agree; score = fraction of `name` in `listing`.
  const dir = (listing: Set<string>, name: Set<string>): number =>
    hasAllModelTokens(listing, name) && qualifiersMatch(listing, name)
      ? overlapScore(listing, name)
      : 0;

  const best = (x: Set<string>, y: Set<string>) =>
    Math.max(dir(x, y), dir(y, x));

  return Math.max(best(aEn, bEn), best(aAr, bAr));
}
