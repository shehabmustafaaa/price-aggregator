import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import AuthForms from "@/components/AuthForms";
import {
  deleteAlertAction,
  logoutAction,
  removeFavoriteAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">{t("title")}</h1>
        <AuthForms locale={locale} />
      </div>
    );
  }

  const [alerts, favorites] = await Promise.all([
    prisma.priceAlert.findMany({
      where: { userId: user.id, active: true },
      include: { product: true },
      orderBy: { id: "desc" },
    }),
    prisma.favorite.findMany({
      where: { userId: user.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{user.email}</h1>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button className="text-sm text-gray-400 underline hover:text-red-400">
            {t("logout")}
          </button>
        </form>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">{t("myAlerts")}</h2>
        {alerts.length === 0 && (
          <p className="text-sm text-gray-500">{t("noAlerts")}</p>
        )}
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-3 flex items-center gap-3"
            >
              <Link
                href={`/p/${a.product.slug}`}
                className="flex-1 hover:text-blue-400"
              >
                {locale === "ar" ? a.product.nameAr : a.product.nameEn}
              </Link>
              <span className="text-sm text-gray-400">
                ≤ {Number(a.targetPrice).toLocaleString(numberLocale)}
              </span>
              <form action={deleteAlertAction}>
                <input type="hidden" name="alertId" value={a.id} />
                <button className="text-xs text-gray-500 underline hover:text-red-400">
                  {t("remove")}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">{t("myFavorites")}</h2>
        {favorites.length === 0 && (
          <p className="text-sm text-gray-500">{t("noFavorites")}</p>
        )}
        <div className="space-y-2">
          {favorites.map((f) => (
            <div
              key={f.productId}
              className="rounded-xl border border-gray-800 bg-gray-900 p-3 flex items-center gap-3"
            >
              <Link
                href={`/p/${f.product.slug}`}
                className="flex-1 hover:text-blue-400"
              >
                {locale === "ar" ? f.product.nameAr : f.product.nameEn}
              </Link>
              <form action={removeFavoriteAction}>
                <input type="hidden" name="productId" value={f.productId} />
                <button className="text-xs text-gray-500 underline hover:text-red-400">
                  {t("remove")}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
