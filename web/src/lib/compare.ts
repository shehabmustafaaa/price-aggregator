/** Device-only "compare set" of products, stored in the browser's
 *  localStorage — no account, no server, no DB. Mirrors recentlyViewed.ts:
 *  a small capped array, all access guarded so private mode / disabled storage
 *  is a silent no-op. Mutators dispatch a window event so the compare toggles
 *  and the tray stay in sync. Client-only. */

export interface CompareItem {
  slug: string;
  nameEn: string;
  nameAr: string;
  image: string | null;
}

export const STORAGE_KEY = "asaar:compare";
export const MAX_COMPARE = 4;
export const CHANGED_EVENT = "asaar:compare-changed";

function emit() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CHANGED_EVENT));
    }
  } catch {
    /* ignore */
  }
}

/** Read the stored set. [] on missing/corrupt/unavailable storage; never throws. */
export function readCompare(): CompareItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is CompareItem =>
          e &&
          typeof e.slug === "string" &&
          typeof e.nameEn === "string" &&
          typeof e.nameAr === "string",
      )
      .slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function persist(list: CompareItem[]) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    /* storage full / disabled — keep the in-memory result */
  }
}

export function isInCompare(slug: string): boolean {
  return readCompare().some((e) => e.slug === slug);
}

/** Toggle a product: remove if present, else add (unless at the cap). Returns
 *  the new list and whether the add was blocked by the cap. */
export function toggleCompare(item: CompareItem): {
  list: CompareItem[];
  atLimit: boolean;
} {
  const current = readCompare();
  const exists = current.some((e) => e.slug === item.slug);
  if (exists) {
    const list = current.filter((e) => e.slug !== item.slug);
    persist(list);
    emit();
    return { list, atLimit: false };
  }
  if (current.length >= MAX_COMPARE) {
    return { list: current, atLimit: true };
  }
  const list = [...current, item];
  persist(list);
  emit();
  return { list, atLimit: false };
}

export function removeCompare(slug: string): CompareItem[] {
  const list = readCompare().filter((e) => e.slug !== slug);
  persist(list);
  emit();
  return list;
}

export function clearCompare() {
  persist([]);
  emit();
}
