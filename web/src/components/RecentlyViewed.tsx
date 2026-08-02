"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  readRecent,
  recordRecent,
  type RecentEntry,
} from "@/lib/recentlyViewed";

type Current = Pick<RecentEntry, "slug" | "nameEn" | "nameAr" | "image">;

/** Device-only "recently viewed" strip (localStorage). When `current` is set
 *  (a product page) it records that product on mount; on every mount it reads
 *  the list and renders it, newest first, excluding `current`. Reads storage
 *  only after mount (empty on SSR/first render) to avoid hydration mismatch.
 *  Renders nothing when empty. Shows no price. */
export default function RecentlyViewed({ current }: { current?: Current }) {
  const locale = useLocale();
  const t = useTranslations("recentlyViewed");
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    // Read localStorage (an external store, absent on the server) only after
    // mount, then seed state — the accepted effect escape hatch. Records the
    // current product first when on a product page.
    const list = current ? recordRecent(current) : readRecent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(list);
    // Record once per product page; current.slug is the stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.slug]);

  const items = entries.filter((e) => e.slug !== current?.slug);
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{t("heading")}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((e) => (
          <Link
            key={e.slug}
            href={`/p/${e.slug}`}
            className="w-32 shrink-0 rounded-xl border border-gray-800 bg-gray-900 p-2 hover:border-blue-500"
          >
            {e.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.image}
                alt=""
                className="mb-2 h-24 w-full rounded bg-white object-contain p-1"
              />
            ) : (
              <div className="mb-2 h-24 w-full rounded bg-gray-800" />
            )}
            <p className="line-clamp-2 text-xs text-gray-300">
              {locale === "ar" ? e.nameAr : e.nameEn}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
