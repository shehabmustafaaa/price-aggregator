import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getBestDeals, getPriceDrops } from "@/lib/catalog/deals";
import DealRow from "@/components/DealRow";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "deals" });
  return { title: t("title") };
}

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("deals");
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const [drops, deals] = await Promise.all([
    getPriceDrops(30),
    getBestDeals(30),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-1">{t("bestDealsTitle")}</h1>
        <p className="text-sm text-gray-400 mb-4">{t("bestDealsSubtitle")}</p>
        {deals.length === 0 ? (
          <p className="text-gray-500">{t("empty")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {deals.map((d) => (
              <DealRow
                key={d.productId}
                slug={d.slug}
                nameEn={d.nameEn}
                nameAr={d.nameAr}
                images={d.images}
                price={d.minPrice}
                badge={t("saveBadge", { pct: d.savePct })}
                subtitle={t("spreadSubtitle", {
                  stores: d.storeCount,
                  high: d.maxPrice.toLocaleString(numberLocale),
                })}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-1">{t("dropsTitle")}</h2>
        <p className="text-sm text-gray-400 mb-4">{t("dropsSubtitle")}</p>
        {drops.length === 0 ? (
          <p className="text-gray-500">{t("dropsEmpty")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {drops.map((d, i) => (
              <DealRow
                key={`${d.productId}-${i}`}
                slug={d.slug}
                nameEn={d.nameEn}
                nameAr={d.nameAr}
                images={d.images}
                price={d.currentPrice}
                badge={t("dropBadge", { pct: d.dropPct })}
                subtitle={t("dropSubtitle", {
                  store: d.storeName,
                  was: d.wasPrice.toLocaleString(numberLocale),
                })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
