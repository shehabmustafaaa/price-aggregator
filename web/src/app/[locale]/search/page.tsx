import { setRequestLocale, getTranslations } from "next-intl/server";
import { searchProducts } from "@/lib/catalog/search";
import ProductCard from "@/components/ProductCard";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "" } = await searchParams;
  const t = await getTranslations("common");

  const results = q ? await searchProducts(q, locale) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        {t("search")}: {q}
      </h1>
      {q && results.length === 0 ? (
        <p className="text-gray-500">{t("noResults", { query: q })}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
