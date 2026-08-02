/** Device-only "recently viewed" products, stored in the browser's
 *  localStorage. No account, no server, no DB — a small capped, newest-first
 *  JSON array. All access is guarded so private mode / disabled storage is a
 *  silent no-op rather than a crash. Client-only. */

export interface RecentEntry {
  slug: string;
  nameEn: string;
  nameAr: string;
  image: string | null;
  viewedAt: number;
}

export const STORAGE_KEY = "asaar:recentlyViewed";
export const MAX_RECENT = 12;

/** Parse the stored list. Returns [] on missing/corrupt/unavailable storage;
 *  never throws. */
export function readRecent(): RecentEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        e &&
        typeof e.slug === "string" &&
        typeof e.nameEn === "string" &&
        typeof e.nameAr === "string",
    );
  } catch {
    return [];
  }
}

/** Record a product view: drop any existing entry with the same slug, prepend
 *  the new one (newest first), cap to MAX_RECENT, persist, return the list.
 *  No-op-safe when storage is unavailable. */
export function recordRecent(entry: Omit<RecentEntry, "viewedAt">): RecentEntry[] {
  const next: RecentEntry = { ...entry, viewedAt: Date.now() };
  const list = [
    next,
    ...readRecent().filter((e) => e.slug !== entry.slug),
  ].slice(0, MAX_RECENT);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // storage full / disabled — keep the in-memory result, ignore persistence.
  }
  return list;
}
