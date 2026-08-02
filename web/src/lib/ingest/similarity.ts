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
