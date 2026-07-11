import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bestPrice } from "@/lib/catalog/products";

interface ProductCardProps {
  product: {
    slug: string;
    nameEn: string;
    nameAr: string;
    images: string[];
    variants: {
      offers: { price: unknown; store: { name: string } }[];
    }[];
  };
}

export default async function ProductCard({ product }: ProductCardProps) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const price = bestPrice(product);
  const storeCount = new Set(
    product.variants.flatMap((v) => v.offers.map((o) => o.store.name)),
  ).size;

  return (
    <Link
      href={`/p/${product.slug}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-blue-500/60 transition-colors"
    >
      {product.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.images[0]}
          alt={name}
          className="mx-auto h-32 w-32 object-contain mb-3 rounded-lg bg-white p-1"
          loading="lazy"
        />
      ) : (
        <div className="mx-auto h-32 w-32 rounded bg-gray-800 mb-3" />
      )}
      <h3 className="text-sm font-medium line-clamp-2 min-h-10">{name}</h3>
      {price != null ? (
        <>
          <p className="mt-2 text-lg font-bold text-blue-400">
            {price.toLocaleString(locale === "ar" ? "ar-EG" : "en-EG")}{" "}
            <span className="text-xs font-normal">{t("egp")}</span>
          </p>
          {storeCount > 1 && (
            <p className="text-xs text-gray-400">
              {t("compareShops", { count: storeCount })}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-500">{t("noOffers")}</p>
      )}
    </Link>
  );
}
