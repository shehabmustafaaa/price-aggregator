import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Windowed numeric pager with first/last jumps, ellipsis gaps, and a
 *  "page X of Y" indicator. `hrefFor(n)` returns the locale-relative href for
 *  page n (both this and the caller are server components, so passing the fn
 *  is fine). RTL-safe: order follows the document's writing direction. */
export default async function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (n: number) => string;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("common");

  // Build a windowed page list with first/last anchors and ellipsis gaps.
  const span = 1; // pages on each side of the current page
  const pages: (number | "gap")[] = [];
  const push = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };
  const windowStart = Math.max(1, page - span);
  const windowEnd = Math.min(totalPages, page + span);

  push(1);
  if (windowStart > 2) pages.push("gap");
  for (let i = windowStart; i <= windowEnd; i++) push(i);
  if (windowEnd < totalPages - 1) pages.push("gap");
  push(totalPages);

  const chip =
    "min-w-9 rounded-full px-3 py-1 border text-sm text-center transition-colors";
  const on = "bg-blue-600 text-white border-blue-600";
  const off = "bg-gray-900 border-gray-700 hover:border-blue-500";
  const muted = "px-2 py-1 text-sm text-gray-600 select-none";

  return (
    <nav
      aria-label={t("pageOf", { page, total: totalPages })}
      className="flex flex-col items-center gap-2 pt-2"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} rel="prev" className={`${chip} ${off}`}>
            {t("prev")}
          </Link>
        )}
        {pages.map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className={muted} aria-hidden="true">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={hrefFor(n)}
              aria-current={n === page ? "page" : undefined}
              className={`${chip} ${n === page ? on : off}`}
            >
              {n}
            </Link>
          ),
        )}
        {page < totalPages && (
          <Link href={hrefFor(page + 1)} rel="next" className={`${chip} ${off}`}>
            {t("next")}
          </Link>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {t("pageOf", { page, total: totalPages })}
      </p>
    </nav>
  );
}
