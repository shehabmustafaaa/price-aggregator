/** Stores mix accessories (earbuds, chargers, cases, card readers…) into
 *  their "mobiles" category pages. This classifier keeps them out of the
 *  phones catalog. It keys on the LEADING noun of the title: accessory
 *  listings start with the accessory ("ايربودز…", "Card reader…"), while a
 *  phone — even one bundled with a free accessory ("Huawei … + سماعات هدية",
 *  "هاتف …") — starts with the brand or the word "phone/هاتف". */

function normalize(text: string): string {
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

// Prefixes are normalized (bare alef, taa-marbuta→ha) to match normalize().
const ACCESSORY_PREFIXES = [
  // Arabic
  "ايربودز", "ايربود", "سماعه", "سماعات", "قارئ", "قاري", "شاحن", "كابل",
  "وصله", "جراب", "كفر", "غطاء", "حامل", "قلم", "باور بانك", "بور بانك",
  "ماوس", "كيبورد", "لوحه مفاتيح", "لاصقه", "بطاريه", "ساعه", "ستاند",
  "محول", "ميموري", "كارت ميموري", "فلاشه", "شريحه",
  // English
  "earbud", "earphone", "headphone", "headset", "charger", "cable",
  "case ", "cover ", "holder", "stylus", "power bank", "powerbank",
  "mouse", "keyboard", "screen protector", "protector", "memory card",
  "card reader", "smart watch", "smartwatch", "battery", "adapter",
];

export function isAccessory(title: string): boolean {
  const t = normalize(title);
  return ACCESSORY_PREFIXES.some((p) => t.startsWith(p));
}
