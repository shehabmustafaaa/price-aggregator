import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/catalog/products";
import ReportPriceButton from "@/components/ReportPriceButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: locale === "ar" ? product.nameAr : product.nameEn };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const offers = product.variants
    .flatMap((v) =>
      v.offers.map((o) => ({ ...o, variantAttrs: v.attrs as Record<string, unknown> })),
    )
    .sort((a, b) => Number(a.price) - Number(b.price));

  const best = offers[0];
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";

  // schema.org Product/Offer structured data for search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameEn,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.images[0] ? { image: product.images[0] } : {}),
    ...(offers.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EGP",
            lowPrice: Number(offers[0].price),
            highPrice: Number(offers[offers.length - 1].price),
            offerCount: offers.length,
          },
        }
      : {}),
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col sm:flex-row gap-6">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={name}
            className="h-48 w-48 object-contain bg-white rounded-xl border border-gray-800 p-2 mx-auto sm:mx-0"
          />
        ) : (
          <div className="h-48 w-48 rounded-xl bg-gray-800 mx-auto sm:mx-0" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          {product.brand && (
            <p className="text-sm text-gray-400">{product.brand.name}</p>
          )}
          {best && (
            <p className="mt-4 text-3xl font-bold text-blue-400">
              {Number(best.price).toLocaleString(numberLocale)}{" "}
              <span className="text-base font-normal">{t("egp")}</span>
              <span className="block text-sm font-normal text-gray-400 mt-1">
                {t("bestPrice")} — {best.store.name}
              </span>
            </p>
          )}
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {t("offers")} ({offers.length})
        </h2>
        {offers.length === 0 && (
          <p className="text-gray-500">{t("noOffers")}</p>
        )}
        <div className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-wrap items-center gap-4"
            >
              <div className="flex-1 min-w-48">
                <p className="font-medium">{offer.store.name}</p>
                <p className="text-xs text-gray-400 line-clamp-1">
                  {offer.titleRaw}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span
                    className={
                      offer.inStock ? "text-green-400" : "text-red-400"
                    }
                  >
                    {offer.inStock ? t("inStock") : t("outOfStock")}
                  </span>
                  {offer.warrantyType === "OFFICIAL_LOCAL" && (
                    <span className="rounded bg-green-950 px-1.5 py-0.5 text-green-300">
                      {t("officialWarranty")}
                    </span>
                  )}
                  {offer.warrantyType === "IMPORTED" && (
                    <span className="rounded bg-amber-950 px-1.5 py-0.5 text-amber-300">
                      {t("importedVersion")}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-end">
                <p className="text-xl font-bold">
                  {Number(offer.price).toLocaleString(numberLocale)}{" "}
                  <span className="text-xs font-normal">{t("egp")}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {offer.shippingCost == null || Number(offer.shippingCost) === 0
                    ? t("freeShipping")
                    : t("shipping", {
                        amount: Number(offer.shippingCost).toLocaleString(numberLocale),
                      })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <a
                  href={`/go/${offer.id}`}
                  target="_blank"
                  rel="nofollow noopener"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {t("goToShop")}
                </a>
                <ReportPriceButton offerId={offer.id} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
