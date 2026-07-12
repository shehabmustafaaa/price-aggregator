import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import "../globals.css";
import SearchBox from "@/components/SearchBox";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: {
      default: t("siteName"),
      template: `%s | ${t("siteName")}`,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "common" });
  const dir = locale === "ar" ? "rtl" : "ltr";
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <header className="bg-gray-950/80 backdrop-blur border-b border-gray-800 sticky top-0 z-10">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
              <Link href="/" className="text-xl font-bold shrink-0 text-blue-400">
                {t("siteName")}
              </Link>
              <div className="flex-1">
                <SearchBox />
              </div>
              <Link
                href="/account"
                className="text-sm text-gray-400 hover:text-gray-100 shrink-0"
              >
                {t("account")}
              </Link>
              <Link
                href="/"
                locale={otherLocale}
                className="text-sm text-gray-400 hover:text-gray-100 shrink-0"
              >
                {otherLocale === "ar" ? "عربي" : "English"}
              </Link>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 w-full flex-1">
            {children}
          </main>
          <footer className="border-t border-gray-800 py-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {t("siteName")}
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
