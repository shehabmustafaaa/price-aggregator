import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getProductBySlug, getSimilarProducts } from "@/lib/catalog/products";
import { getPriceHistory } from "@/lib/catalog/offers";
import { buildFeatures } from "@/lib/catalog/features";
import ReportPriceButton from "@/components/ReportPriceButton";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import ImageGallery from "@/components/ImageGallery";
import ProductCard from "@/components/ProductCard";
import { colorLabel } from "@/lib/catalog/colors";
import { Link } from "@/i18n/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { setAlertAction, toggleFavoriteAction } from "./actions";

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
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { color: selectedColor } = await searchParams;
  const t = await getTranslations("common");

  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [history, similar, admin] = await Promise.all([
    getPriceHistory(product.id, 90),
    getSimilarProducts(product, 8),
    getAdminUser(),
  ]);

  const userId = await getSessionUserId();
  const [myAlert, myFavorite] = userId
    ? await Promise.all([
        prisma.priceAlert.findFirst({
          where: { userId, productId: product.id, active: true },
        }),
        prisma.favorite.findUnique({
          where: { userId_productId: { userId, productId: product.id } },
        }),
      ])
    : [null, null];

  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const description = locale === "ar" ? product.descriptionAr : product.descriptionEn;
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const features = buildFeatures(product, product.category.specDefinitions, locale, {
    storage: t("storage"),
    ram: t("ram"),
    network: t("network"),
    colors: t("colors"),
    yes: t("yes"),
  });

  const allOffers = product.variants
    .flatMap((v) => v.offers)
    .sort((a, b) => Number(a.price) - Number(b.price));

  // Colors come from offer listing attrs; best (lowest) price per color.
  const byColor = new Map<string, { count: number; best: number }>();
  for (const o of allOffers) {
    const c = (o.attrs as Record<string, unknown>)?.color;
    if (typeof c !== "string" || !c) continue;
    const entry = byColor.get(c) ?? { count: 0, best: Infinity };
    entry.count++;
    entry.best = Math.min(entry.best, Number(o.price));
    byColor.set(c, entry);
  }

  const offers =
    selectedColor && byColor.has(selectedColor)
      ? allOffers.filter(
          (o) =>
            (o.attrs as Record<string, unknown>)?.color === selectedColor,
        )
      : allOffers;

  const best = offers[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameEn,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.images[0] ? { image: product.images } : {}),
    ...(allOffers.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EGP",
            lowPrice: Number(allOffers[0].price),
            highPrice: Number(allOffers[allOffers.length - 1].price),
            offerCount: allOffers.length,
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
        <ImageGallery images={product.images} alt={name} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold">{name}</h1>
            {admin && (
              <a
                href={`/${locale}/admin/catalog/${product.id}`}
                className="shrink-0 text-sm text-amber-400 hover:text-amber-300 underline"
              >
                {t("editProduct")}
              </a>
            )}
          </div>
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

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={setAlertAction} className="flex items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="productId" value={product.id} />
              <input
                type="number"
                name="targetPrice"
                min={1}
                required
                defaultValue={myAlert ? Number(myAlert.targetPrice) : undefined}
                placeholder={t("targetPrice")}
                className="w-32 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-600/10"
              >
                {myAlert ? t("updateAlert") : t("setAlert")}
              </button>
            </form>
            <form action={toggleFavoriteAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="productId" value={product.id} />
              <button
                type="submit"
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  myFavorite
                    ? "border-red-500 text-red-400"
                    : "border-gray-700 text-gray-300 hover:border-red-500"
                }`}
              >
                {myFavorite ? `♥ ${t("inFavorites")}` : `♡ ${t("addFavorite")}`}
              </button>
            </form>
          </div>

          {byColor.size > 0 && (
            <div className="mt-5">
              <p className="text-sm text-gray-400 mb-2">{t("colors")}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/p/${slug}`}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    !selectedColor
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-gray-700 bg-gray-900 hover:border-blue-500"
                  }`}
                >
                  {t("allColors")}
                </Link>
                {[...byColor.entries()].map(([color, info]) => (
                  <Link
                    key={color}
                    href={`/p/${slug}?color=${encodeURIComponent(color)}`}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selectedColor === color
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-gray-700 bg-gray-900 hover:border-blue-500"
                    }`}
                  >
                    {colorLabel(color, locale)}
                    <span className="ms-1.5 text-xs text-gray-400">
                      {info.best.toLocaleString(numberLocale)} {t("egp")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {history.length >= 2 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("priceHistory")}</h2>
          <PriceHistoryChart
            history={history}
            currencyLabel={t("egp")}
            locale={locale}
          />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {t("offers")} ({offers.length})
        </h2>
        {offers.length === 0 && <p className="text-gray-500">{t("noOffers")}</p>}
        <div className="space-y-3">
          {offers.map((offer) => {
            const offerColor = (offer.attrs as Record<string, unknown>)?.color;
            return (
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
                    {typeof offerColor === "string" && offerColor && (
                      <span className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-300">
                        {colorLabel(offerColor, locale)}
                      </span>
                    )}
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
                    {offer.shippingCost == null ||
                    Number(offer.shippingCost) === 0
                      ? t("freeShipping")
                      : t("shipping", {
                          amount:
                            Number(offer.shippingCost).toLocaleString(numberLocale),
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
            );
          })}
        </div>
      </section>

      {features.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("features")}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-w-2xl">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex justify-between gap-3 border-b border-gray-800 py-1.5 text-sm"
              >
                <dt className="text-gray-400">{f.label}</dt>
                <dd className="text-end">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {description && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("description")}</h2>
          <p className="text-sm text-gray-300 whitespace-pre-line max-w-2xl leading-relaxed">
            {description}
          </p>
        </section>
      )}

      {similar.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("similarProducts")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
