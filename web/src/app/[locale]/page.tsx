import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listCategories, listLatestProducts } from "@/lib/catalog/products";
import { getBestDeals } from "@/lib/catalog/deals";
import ProductCard from "@/components/ProductCard";
import DealRow from "@/components/DealRow";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const td = await getTranslations("deals");
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const [categories, latest, deals] = await Promise.all([
    listCategories(),
    listLatestProducts(12),
    getBestDeals(4),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-3">{t("categories")}</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="rounded-full border border-gray-700 bg-gray-900 px-4 py-1.5 text-sm hover:border-blue-500 hover:text-blue-400"
            >
              {locale === "ar" ? c.nameAr : c.nameEn}
            </Link>
          ))}
        </div>
      </section>

      {deals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{td("bestDealsTitle")}</h2>
            <Link href="/deals" className="text-sm text-blue-400 hover:underline">
              {td("seeAll")}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {deals.map((d) => (
              <DealRow
                key={d.productId}
                slug={d.slug}
                nameEn={d.nameEn}
                nameAr={d.nameAr}
                images={d.images}
                price={d.minPrice}
                badge={td("saveBadge", { pct: d.savePct })}
                subtitle={td("spreadSubtitle", {
                  stores: d.storeCount,
                  high: d.maxPrice.toLocaleString(numberLocale),
                })}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">{t("latestProducts")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {latest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
