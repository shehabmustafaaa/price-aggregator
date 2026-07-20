import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "About / عن الموقع" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";

  return (
    <LegalPage title={ar ? "عن أسعار" : "About Asaar"}>
      {ar ? (
        <>
          <p>
            أسعار هو موقع لمقارنة أسعار الموبايلات في مصر. نجمع الأسعار من
            متاجر إلكترونية مختلفة ونعرضها في مكان واحد حتى تجد أفضل سعر
            بسهولة.
          </p>
          <p>
            نحن لسنا متجراً ولا نبيع أي منتجات. عند الضغط على &quot;اذهب
            للمتجر&quot; يتم تحويلك إلى موقع المتجر لإتمام الشراء مباشرة معه.
          </p>
          <p>
            نحدّث الأسعار باستمرار، لكن قد تتغير الأسعار أو تختلف عن الموقع
            الأصلي؛ السعر النهائي هو المعروض في موقع المتجر وقت الشراء.
          </p>
        </>
      ) : (
        <>
          <p>
            Asaar is a phone price-comparison site for Egypt. We gather prices
            from different online stores and show them in one place so you can
            find the best price easily.
          </p>
          <p>
            We are not a shop and we do not sell anything. When you click
            &quot;Go to Shop&quot; you are taken to the store&apos;s own site to
            buy directly from them.
          </p>
          <p>
            We update prices continuously, but prices can change or differ from
            the original site; the final price is the one shown on the
            store&apos;s site at the time of purchase.
          </p>
        </>
      )}
    </LegalPage>
  );
}
