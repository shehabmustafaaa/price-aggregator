"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ReportPriceButton({ offerId }: { offerId: number }) {
  const t = useTranslations("common");
  const [sent, setSent] = useState(false);

  if (sent) {
    return <span className="text-xs text-green-600">{t("reportThanks")}</span>;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setSent(true);
        await fetch("/api/report-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerId }),
        }).catch(() => {});
      }}
      className="text-xs text-gray-500 hover:text-red-400 underline"
    >
      {t("reportPrice")}
    </button>
  );
}
