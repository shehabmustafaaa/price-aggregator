/** Shared Arabic-aware text normalization for search and matching:
 *  unify alef/hamza/taa-marbuta/alef-maqsura, strip diacritics & tatweel,
 *  lowercase, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchTokens(query: string): string[] {
  return normalizeText(query)
    .split(/[^\p{L}\p{N}+]+/u)
    .filter((t) => t.length > 0);
}
