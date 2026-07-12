/** Canonical color normalization (guardrail: normalize at ingest, in ONE
 *  place, so every store adapter — present and future — is covered).
 *  Offers store `attrs.color` as a canonical key; UI renders a localized
 *  label. Unmapped values keep the raw string as both key and label. */

interface ColorDef {
  en: string;
  ar: string;
  aliases: string[]; // lowercase, Arabic pre-normalized (bare alef, no diacritics)
}

export const COLORS: Record<string, ColorDef> = {
  black: { en: "Black", ar: "أسود", aliases: ["black", "اسود", "ink black", "shadow black", "midnight black", "phantom black", "اسود شادو"] },
  white: { en: "White", ar: "أبيض", aliases: ["white", "ابيض", "moon white", "starlight"] },
  gray: { en: "Gray", ar: "رمادي", aliases: ["gray", "grey", "رمادي", "graphite", "جرافيتي", "space gray", "titanium gray"] },
  silver: { en: "Silver", ar: "فضي", aliases: ["silver", "فضي", "titanium silver"] },
  gold: { en: "Gold", ar: "ذهبي", aliases: ["gold", "ذهبي", "champagne"] },
  blue: { en: "Blue", ar: "أزرق", aliases: ["blue", "ازرق", "navy", "كحلي", "ocean blue"] },
  "light-blue": { en: "Light Blue", ar: "أزرق فاتح", aliases: ["light blue", "ازرق فاتح", "sky blue", "ice blue", "cloudline blue", "ازرق كلاودلاين"] },
  "dark-blue": { en: "Dark Blue", ar: "أزرق غامق", aliases: ["dark blue", "ازرق غامق", "midnight blue"] },
  green: { en: "Green", ar: "أخضر", aliases: ["green", "اخضر", "mint"] },
  "dark-green": { en: "Dark Green", ar: "أخضر غامق", aliases: ["dark green", "اخضر غامق", "forest green"] },
  red: { en: "Red", ar: "أحمر", aliases: ["red", "احمر", "crimson"] },
  pink: { en: "Pink", ar: "وردي", aliases: ["pink", "وردي", "rose", "روز"] },
  purple: { en: "Purple", ar: "بنفسجي", aliases: ["purple", "بنفسجي", "ارجواني", "violet", "lavender", "بنفسجي فاتح", "light purple"] },
  yellow: { en: "Yellow", ar: "أصفر", aliases: ["yellow", "اصفر", "lemon"] },
  orange: { en: "Orange", ar: "برتقالي", aliases: ["orange", "برتقالي", "coral"] },
  olive: { en: "Olive", ar: "زيتوني", aliases: ["olive", "زيتوني"] },
  sand: { en: "Sand", ar: "رملي", aliases: ["sand", "رملي", "sandy"] },
  beige: { en: "Beige", ar: "بيج", aliases: ["beige", "بيج", "cream"] },
  brown: { en: "Brown", ar: "بني", aliases: ["brown", "بني", "mocha"] },
  titanium: { en: "Titanium", ar: "تيتانيوم", aliases: ["titanium", "تيتانيوم", "تيتانيوم بولاريس", "natural titanium"] },
  copper: { en: "Copper", ar: "نحاسي", aliases: ["copper", "نحاسي", "bronze"] },
};

const aliasIndex = new Map<string, string>();
for (const [key, def] of Object.entries(COLORS)) {
  aliasIndex.set(normalizeText(def.en), key);
  aliasIndex.set(normalizeText(def.ar), key);
  for (const alias of def.aliases) aliasIndex.set(normalizeText(alias), key);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/** Raw store color string → canonical key ("black") or the raw string
 *  when unknown (so nothing is silently lost). */
export function canonicalColor(raw: string): string {
  const norm = normalizeText(raw);
  const exact = aliasIndex.get(norm);
  if (exact) return exact;
  // "Awesome Ink Black" → try trailing word sequences against aliases.
  const words = norm.split(" ");
  for (let i = 0; i < words.length - 1; i++) {
    const tail = words.slice(i).join(" ");
    const hit = aliasIndex.get(tail);
    if (hit) return hit;
  }
  const last = aliasIndex.get(words[words.length - 1]);
  if (last) return last;
  return raw;
}

/** Canonical key (or raw passthrough) → display label for a locale. */
export function colorLabel(key: string, locale: string): string {
  const def = COLORS[key];
  if (!def) return key;
  return locale === "ar" ? def.ar : def.en;
}
