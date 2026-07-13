import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  getCategoryBySlug,
  getSpecFacets,
  listBrandsInCategory,
  listCategoryProducts,
  type CategoryFilters,
} from "@/lib/catalog/products";
import ProductCard from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";

function parseNums(raw: string | string[] | undefined): number[] {
  if (typeof raw !== "string" || !raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

/** Build a category href from a base filter set plus overrides, dropping
 *  empty params. Multi-select values arrive as arrays and become CSV. */
function buildHref(
  slug: string,
  base: CategoryFilters,
  overrides: Partial<Record<string, string | number | number[] | undefined>>,
): string {
  const params = new URLSearchParams();
  const merged: Record<string, unknown> = {
    brand: base.brandSlug,
    sort: base.sort,
    min: base.minPrice,
    max: base.maxPrice,
    storage: base.storageGb,
    ram: base.ramGb,
    ...overrides,
  };
  for (const [key, value] of Object.entries(merged)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `/c/${slug}${qs ? `?${qs}` : ""}`;
}

function toggle(list: number[], value: number): number[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

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
      sp.sort === "price_asc" || sp.sort === "price_desc" ? sp.sort : undefined,
    ramGb: parseNums(sp.ram),
    storageGb: parseNums(sp.storage),
  };
  const requestedPage = typeof sp.page === "string" ? Number(sp.page) : 1;

  const [paged, brands, facets] = await Promise.all([
    listCategoryProducts(category.id, filters, requestedPage),
    listBrandsInCategory(category.id),
    getSpecFacets(category.id),
  ]);
  const products = paged.items;

  const name = locale === "ar" ? category.nameAr : category.nameEn;
  const chipBase =
    "rounded-full px-3 py-1 border text-sm transition-colors";
  const chipOn = "bg-blue-600 text-white border-blue-600";
  const chipOff = "bg-gray-900 border-gray-700 hover:border-blue-500";
  const anyFilter =
    filters.brandSlug ||
    filters.sort ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.ramGb?.length ||
    filters.storageGb?.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{name}</h1>
        {anyFilter && (
          <Link href={`/c/${slug}`} className="text-sm text-gray-400 underline hover:text-gray-100">
            {t("clearFilters")}
          </Link>
        )}
      </div>

      {/* Brands */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(slug, filters, { brand: undefined })}
          className={`${chipBase} ${!filters.brandSlug ? chipOn : chipOff}`}
        >
          {t("allBrands")}
        </Link>
        {brands.map((b) => (
          <Link
            key={b.id}
            href={buildHref(slug, filters, { brand: b.slug })}
            className={`${chipBase} ${filters.brandSlug === b.slug ? chipOn : chipOff}`}
          >
            {b.name}
          </Link>
        ))}
      </div>

      {/* Storage facet */}
      {facets.storageGb.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400 me-1">{t("storage")}</span>
          {facets.storageGb.map((v) => (
            <Link
              key={v}
              href={buildHref(slug, filters, {
                storage: toggle(filters.storageGb ?? [], v),
              })}
              className={`${chipBase} ${filters.storageGb?.includes(v) ? chipOn : chipOff}`}
            >
              {v >= 1024 ? `${v / 1024} TB` : `${v} GB`}
            </Link>
          ))}
        </div>
      )}

      {/* RAM facet */}
      {facets.ramGb.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400 me-1">{t("ram")}</span>
          {facets.ramGb.map((v) => (
            <Link
              key={v}
              href={buildHref(slug, filters, {
                ram: toggle(filters.ramGb ?? [], v),
              })}
              className={`${chipBase} ${filters.ramGb?.includes(v) ? chipOn : chipOff}`}
            >
              {v} GB
            </Link>
          ))}
        </div>
      )}

      {/* Sort + price range */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(slug, filters, { sort: "price_asc" })}
          className={`${chipBase} ${filters.sort === "price_asc" ? chipOn : chipOff}`}
        >
          {t("sortPriceAsc")}
        </Link>
        <Link
          href={buildHref(slug, filters, { sort: "price_desc" })}
          className={`${chipBase} ${filters.sort === "price_desc" ? chipOn : chipOff}`}
        >
          {t("sortPriceDesc")}
        </Link>
        <span className="mx-2 text-gray-700">|</span>
        <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
          {filters.brandSlug && (
            <input type="hidden" name="brand" value={filters.brandSlug} />
          )}
          {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
          {filters.storageGb?.length ? (
            <input type="hidden" name="storage" value={filters.storageGb.join(",")} />
          ) : null}
          {filters.ramGb?.length ? (
            <input type="hidden" name="ram" value={filters.ramGb.join(",")} />
          ) : null}
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
      </div>

      <p className="text-sm text-gray-500">
        {t("resultsCount", { count: paged.total })}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {paged.totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {paged.page > 1 && (
            <Link
              href={buildHref(slug, filters, {
                page: paged.page - 1 > 1 ? paged.page - 1 : undefined,
              })}
              className={`${chipBase} ${chipOff}`}
            >
              {t("prev")}
            </Link>
          )}
          {pageWindow(paged.page, paged.totalPages).map((n) => (
            <Link
              key={n}
              href={buildHref(slug, filters, { page: n > 1 ? n : undefined })}
              className={`${chipBase} ${n === paged.page ? chipOn : chipOff}`}
            >
              {n}
            </Link>
          ))}
          {paged.page < paged.totalPages && (
            <Link
              href={buildHref(slug, filters, { page: paged.page + 1 })}
              className={`${chipBase} ${chipOff}`}
            >
              {t("next")}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/** Page numbers to show: a window of up to 5 around the current page. */
function pageWindow(current: number, total: number): number[] {
  const span = 2;
  let start = Math.max(1, current - span);
  const end = Math.min(total, start + span * 2);
  start = Math.max(1, end - span * 2);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
