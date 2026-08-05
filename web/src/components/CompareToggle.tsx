"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CHANGED_EVENT,
  isInCompare,
  toggleCompare,
  type CompareItem,
} from "@/lib/compare";

/** Small compare toggle overlaid on a product card. Stops the click from
 *  bubbling to the card's <Link>. Reflects membership on mount and whenever the
 *  compare set changes (via the CHANGED_EVENT), so all cards stay in sync. */
export default function CompareToggle({ item }: { item: CompareItem }) {
  const t = useTranslations("compare");
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isInCompare(item.slug));
    sync();
    window.addEventListener(CHANGED_EVENT, sync);
    return () => window.removeEventListener(CHANGED_EVENT, sync);
  }, [item.slug]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { atLimit } = toggleCompare(item);
    if (atLimit) {
      // Brief non-blocking hint; the set is full.
      setActive(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? t("remove") : t("add")}
      className={`absolute end-2 top-2 z-10 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-gray-700 bg-gray-950/80 text-gray-300 hover:border-blue-500"
      }`}
    >
      {active ? t("addedShort") : t("addShort")}
    </button>
  );
}
