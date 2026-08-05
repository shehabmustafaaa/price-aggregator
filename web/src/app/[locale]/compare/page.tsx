import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  getProductsForCompare,
  buildComparison,
} from "@/lib/catalog/compare";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return { title: t("pageTitle") };
}

/** Side-by-side spec comparison at /compare?p=slug1,slug2,... Server-rendered
 *  from the slugs so a shared link works with no device state. */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { p = "" } = await searchParams;
  const t = await getTranslations("compare");
  const tc = await getTranslations("common");

  const slugs = p.split(",").map((s) => s.trim()).filter(Boolean);
  const products = await getProductsForCompare(slugs);

  if (products.length < 2) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">{t("heading")}</h1>
        <p className="text-sm text-gray-400">{t("needTwoPrompt")}</p>
        <Link href="/" className="text-sm text-blue-400 underline">
          {t("browse")}
        </Link>
      </div>
    );
  }

  const { columns, rows, cheapestIndex } = buildComparison(products, locale, {
    storage: tc("storage"),
    ram: tc("ram"),
    network: tc("network"),
    colors: tc("colors"),
    yes: tc("yes"),
  });
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("heading")}</h1>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-32 border-b border-gray-800 p-2 text-start align-bottom text-xs font-normal text-gray-500">
                {t("spec")}
              </th>
              {columns.map((c, i) => (
                <th
                  key={c.slug}
                  className="border-b border-gray-800 p-2 align-bottom"
                >
                  <Link href={`/p/${c.slug}`} className="block hover:opacity-80">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.image}
                        alt=""
                        className="mx-auto mb-2 h-20 w-20 rounded bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="mx-auto mb-2 h-20 w-20 rounded bg-gray-800" />
                    )}
                    <span className="block text-center text-xs font-medium text-gray-200">
                      {c.name}
                    </span>
                  </Link>
                  <div
                    className={`mt-1 text-center text-sm font-bold ${
                      i === cheapestIndex ? "text-green-400" : "text-blue-400"
                    }`}
                  >
                    {c.price != null ? (
                      <>
                        {c.price.toLocaleString(numberLocale)}{" "}
                        <span className="text-[10px] font-normal">
                          {tc("egp")}
                        </span>
                        {i === cheapestIndex && (
                          <span className="ms-1 rounded bg-green-900/60 px-1 text-[10px] text-green-300">
                            {t("cheapest")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-normal text-gray-500">
                        {tc("noOffers")}
                      </span>
                    )}
                  </div>
                  <div className="text-center text-[11px] text-gray-500">
                    {t("storeCount", { count: c.storeCount })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={row.differs ? "bg-amber-500/5" : undefined}
              >
                <th className="border-b border-gray-800 p-2 text-start align-top text-xs font-medium text-gray-400">
                  {row.label}
                  {row.differs && (
                    <span
                      className="ms-1 text-amber-400"
                      title={t("differs")}
                      aria-label={t("differs")}
                    >
                      •
                    </span>
                  )}
                </th>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className="border-b border-gray-800 p-2 text-center align-top"
                  >
                    {v || <span className="text-gray-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
