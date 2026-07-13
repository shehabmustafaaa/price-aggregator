import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Windowed numeric pager. `hrefFor(n)` returns the locale-relative href for
 *  page n (both this and the caller are server components, so passing the fn
 *  is fine). */
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

  const span = 2;
  const end = Math.min(totalPages, Math.max(1, page - span) + span * 2);
  const start = Math.max(1, end - span * 2);
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);

  const chip = "rounded-full px-3 py-1 border text-sm transition-colors";
  const on = "bg-blue-600 text-white border-blue-600";
  const off = "bg-gray-900 border-gray-700 hover:border-blue-500";

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 pt-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={`${chip} ${off}`}>
          {t("prev")}
        </Link>
      )}
      {nums.map((n) => (
        <Link
          key={n}
          href={hrefFor(n)}
          className={`${chip} ${n === page ? on : off}`}
        >
          {n}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className={`${chip} ${off}`}>
          {t("next")}
        </Link>
      )}
    </nav>
  );
}
