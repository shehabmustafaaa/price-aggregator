"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CHANGED_EVENT,
  clearCompare,
  readCompare,
  removeCompare,
  type CompareItem,
} from "@/lib/compare";

/** Floating compare tray. Reads the device compare set after mount and on every
 *  CHANGED_EVENT. Hidden when empty; the "Compare" action is enabled once ≥2
 *  products are selected and links to /compare?p=slug1,slug2,... */
export default function CompareTray() {
  const locale = useLocale();
  const t = useTranslations("compare");
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readCompare());
    sync();
    window.addEventListener(CHANGED_EVENT, sync);
    return () => window.removeEventListener(CHANGED_EVENT, sync);
  }, []);

  if (items.length === 0) return null;

  const slugs = items.map((i) => i.slug).join(",");
  const canCompare = items.length >= 2;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-sm font-medium text-gray-200">
          {t("trayTitle", { count: items.length })}
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {items.map((it) => (
            <span
              key={it.slug}
              className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-900 py-1 pe-1 ps-2 text-xs"
            >
              {locale === "ar" ? it.nameAr : it.nameEn}
              <button
                type="button"
                onClick={() => removeCompare(it.slug)}
                aria-label={t("remove")}
                className="rounded px-1 text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => clearCompare()}
          className="text-xs text-gray-500 underline hover:text-gray-300"
        >
          {t("clear")}
        </button>
        {canCompare ? (
          <Link
            href={`/compare?p=${slugs}`}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            {t("compareCta", { count: items.length })}
          </Link>
        ) : (
          <span className="rounded-lg bg-gray-800 px-4 py-1.5 text-sm text-gray-500">
            {t("needTwo")}
          </span>
        )}
      </div>
    </div>
  );
}
