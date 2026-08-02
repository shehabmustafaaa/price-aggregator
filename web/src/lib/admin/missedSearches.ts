import { prisma } from "@/lib/db";
import { normalizeText } from "@/lib/text";

export interface MissedSearchRow {
  /** A representative raw query for the group (the most recently searched). */
  term: string;
  /** The grouping key: normalizeText(query). Also used to dismiss the group. */
  normalized: string;
  count: number;
  locales: string[];
  lastSearchedAt: Date;
}

/** How many source rows to scan and how many aggregated rows to return.
 *  The missed_searches table only holds zero-result queries, so this is small;
 *  a bounded in-memory pass is enough (see research.md). */
const SCAN_LIMIT = 5000;

/** Aggregate logged missed searches by NORMALIZED term (FR-004): equivalent
 *  searches (case/whitespace/Arabic-orthography variants) collapse into one row.
 *  Grouping happens in JS because the normalization lives in JS (normalizeText);
 *  a raw SQL GROUP BY on `query` would treat variants as distinct rows. */
export async function aggregateMissedSearches(
  limit = 100,
): Promise<MissedSearchRow[]> {
  const rows = await prisma.missedSearch.findMany({
    orderBy: { createdAt: "desc" },
    take: SCAN_LIMIT,
    select: { query: true, locale: true, createdAt: true },
  });

  const groups = new Map<
    string,
    { term: string; count: number; locales: Set<string>; lastSearchedAt: Date }
  >();
  for (const row of rows) {
    const normalized = normalizeText(row.query);
    if (!normalized) continue;
    const existing = groups.get(normalized);
    if (existing) {
      existing.count++;
      existing.locales.add(row.locale);
      // rows are desc by createdAt, so the first-seen term/timestamp is newest.
    } else {
      groups.set(normalized, {
        term: row.query,
        count: 1,
        locales: new Set([row.locale]),
        lastSearchedAt: row.createdAt,
      });
    }
  }

  return [...groups.entries()]
    .map(([normalized, g]) => ({
      term: g.term,
      normalized,
      count: g.count,
      locales: [...g.locales].sort(),
      lastSearchedAt: g.lastSearchedAt,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.lastSearchedAt.getTime() - a.lastSearchedAt.getTime(),
    )
    .slice(0, limit);
}

/** Dismiss a term: delete every missed_searches row whose normalized query
 *  matches (all locales/casings), so the whole aggregated row disappears and
 *  stays gone (FR-005). No-op if nothing matches — never throws (edge case 4). */
export async function dismissMissedSearch(normalizedTerm: string): Promise<void> {
  const rows = await prisma.missedSearch.findMany({
    select: { id: true, query: true },
    take: SCAN_LIMIT,
  });
  const ids = rows
    .filter((r) => normalizeText(r.query) === normalizedTerm)
    .map((r) => r.id);
  if (ids.length === 0) return;
  await prisma.missedSearch.deleteMany({ where: { id: { in: ids } } });
}
