import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Compact horizontal deal row used on the deals page and home teasers. */
export default async function DealRow({
  slug,
  nameEn,
  nameAr,
  images,
  price,
  badge,
  subtitle,
}: {
  slug: string;
  nameEn: string;
  nameAr: string;
  images: string[];
  price: number;
  badge: string;
  subtitle: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const name = locale === "ar" ? nameAr : nameEn;
  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";

  return (
    <Link
      href={`/p/${slug}`}
      className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3 hover:border-blue-500/60 transition-colors"
    >
      {images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0]}
          alt={name}
          className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1"
          loading="lazy"
        />
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-800" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2">{name}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="text-end shrink-0">
        <span className="inline-block rounded bg-green-950 px-2 py-0.5 text-xs font-bold text-green-300">
          {badge}
        </span>
        <p className="mt-1 text-sm font-bold text-blue-400">
          {price.toLocaleString(numberLocale)}{" "}
          <span className="text-xs font-normal">{t("egp")}</span>
        </p>
      </div>
    </Link>
  );
}
