import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listCategories, listLatestProducts } from "@/lib/catalog/products";
import { getBestDeals } from "@/lib/catalog/deals";
import ProductCard from "@/components/ProductCard";
import DealRow from "@/components/DealRow";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number(pageParam) : 1;
  const t = await getTranslations("common");
  const td = await getTranslations("deals");
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const onFirstPage = !pageParam || page <= 1;

  const [categories, latest, deals] = await Promise.all([
    listCategories(),
    listLatestProducts(page),
    onFirstPage ? getBestDeals(4) : Promise.resolve([]),
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

      {onFirstPage && deals.length > 0 && (
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
          {latest.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <Pagination
          page={latest.page}
          totalPages={latest.totalPages}
          hrefFor={(n) => (n > 1 ? `/?page=${n}` : "/")}
        />
      </section>
    </div>
  );
}
