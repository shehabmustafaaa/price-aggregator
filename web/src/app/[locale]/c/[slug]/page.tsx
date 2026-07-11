import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  getCategoryBySlug,
  listBrandsInCategory,
  listCategoryProducts,
  type CategoryFilters,
} from "@/lib/catalog/products";
import ProductCard from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("common");

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters: CategoryFilters = {
    brandSlug: typeof sp.brand === "string" ? sp.brand : undefined,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    sort:
      sp.sort === "price_asc" || sp.sort === "price_desc"
        ? sp.sort
        : undefined,
  };

  const [products, brands] = await Promise.all([
    listCategoryProducts(category.id, filters),
    listBrandsInCategory(category.id),
  ]);

  const name = locale === "ar" ? category.nameAr : category.nameEn;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{name}</h1>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/c/${slug}`}
          className={`rounded-full px-3 py-1 border ${!filters.brandSlug ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 border-gray-700 hover:border-blue-500"}`}
        >
          {t("allBrands")}
        </Link>
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/c/${slug}?brand=${b.slug}`}
            className={`rounded-full px-3 py-1 border ${filters.brandSlug === b.slug ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 border-gray-700 hover:border-blue-500"}`}
          >
            {b.name}
          </Link>
        ))}
        <span className="mx-2 text-gray-700">|</span>
        <Link
          href={`/c/${slug}?${new URLSearchParams({ ...(filters.brandSlug ? { brand: filters.brandSlug } : {}), sort: "price_asc" })}`}
          className={`rounded-full px-3 py-1 border ${filters.sort === "price_asc" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 border-gray-700 hover:border-blue-500"}`}
        >
          {t("sortPriceAsc")}
        </Link>
        <Link
          href={`/c/${slug}?${new URLSearchParams({ ...(filters.brandSlug ? { brand: filters.brandSlug } : {}), sort: "price_desc" })}`}
          className={`rounded-full px-3 py-1 border ${filters.sort === "price_desc" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 border-gray-700 hover:border-blue-500"}`}
        >
          {t("sortPriceDesc")}
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
        {filters.brandSlug && (
          <input type="hidden" name="brand" value={filters.brandSlug} />
        )}
        {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
        <label className="text-gray-400">{t("priceRange")}</label>
        <input
          type="number"
          name="min"
          defaultValue={filters.minPrice ?? ""}
          min={0}
          placeholder="0"
          className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1"
        />
        <span className="text-gray-400">–</span>
        <input
          type="number"
          name="max"
          defaultValue={filters.maxPrice ?? ""}
          min={0}
          placeholder="100000"
          className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1"
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1 hover:border-blue-500"
        >
          {t("apply")}
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
