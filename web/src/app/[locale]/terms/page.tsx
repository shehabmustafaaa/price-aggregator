import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service / شروط الاستخدام" };

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";

  return (
    <LegalPage title={ar ? "شروط الاستخدام" : "Terms of Service"}>
      {ar ? (
        <>
          <p>باستخدامك موقع أسعار فأنت توافق على الشروط التالية.</p>
          <h2>الأسعار معلومات فقط</h2>
          <p>
            نجمع الأسعار تلقائياً من متاجر إلكترونية خارجية. رغم أننا نحدّثها
            باستمرار، قد تكون الأسعار قديمة أو غير دقيقة أو مختلفة عن موقع
            المتجر. السعر النهائي الملزم هو المعروض في موقع المتجر وقت الشراء.
          </p>
          <h2>نحن لسنا البائع</h2>
          <p>
            أسعار موقع مقارنة أسعار فقط — لا نبيع أي منتجات ولا نتدخل في عملية
            الشراء أو الشحن أو الضمان أو الاسترجاع. أي عملية شراء تتم مباشرة
            بينك وبين المتجر وتخضع لشروطه.
          </p>
          <h2>العلامات التجارية</h2>
          <p>
            أسماء المتاجر والمنتجات وشعاراتها ملك لأصحابها، وتُعرض هنا لغرض
            التعريف والمقارنة فقط.
          </p>
          <h2>الاستخدام المقبول</h2>
          <p>
            لا يجوز إساءة استخدام الموقع، بما في ذلك محاولات الاختراق أو جمع
            البيانات آلياً بشكل مفرط أو إرسال محتوى ضار عبر نماذج الموقع.
          </p>
          <h2>حدود المسؤولية</h2>
          <p>
            الموقع مقدَّم &quot;كما هو&quot;. لا نتحمل أي مسؤولية عن خسائر
            ناتجة عن أخطاء في الأسعار أو عدم توفر المنتجات أو قرارات شراء
            مبنية على المعلومات المعروضة هنا — تحقق دائماً من موقع المتجر قبل
            الشراء.
          </p>
          <h2>تعديل الشروط</h2>
          <p>
            قد نحدّث هذه الشروط من وقت لآخر؛ استمرارك في استخدام الموقع بعد
            التحديث يعني موافقتك على الشروط الجديدة.
          </p>
        </>
      ) : (
        <>
          <p>By using Asaar you agree to the following terms.</p>
          <h2>Prices are informational only</h2>
          <p>
            We collect prices automatically from third-party online stores.
            Although we update them continuously, prices may be stale,
            inaccurate, or differ from the store&apos;s site. The binding final
            price is the one shown on the store&apos;s site at the time of
            purchase.
          </p>
          <h2>We are not the seller</h2>
          <p>
            Asaar is a price-comparison site only — we do not sell any products
            and we are not involved in purchase, shipping, warranty, or
            returns. Any purchase happens directly between you and the store,
            under the store&apos;s own terms.
          </p>
          <h2>Trademarks</h2>
          <p>
            Store and product names and logos belong to their respective
            owners and are shown here for identification and comparison
            purposes only.
          </p>
          <h2>Acceptable use</h2>
          <p>
            You may not misuse the site, including attempting to breach its
            security, excessively scraping it, or submitting harmful content
            through its forms.
          </p>
          <h2>Limitation of liability</h2>
          <p>
            The site is provided &quot;as is&quot;. We accept no liability for
            losses arising from price errors, product unavailability, or
            purchase decisions based on information shown here — always verify
            on the store&apos;s site before buying.
          </p>
          <h2>Changes to these terms</h2>
          <p>
            We may update these terms from time to time; continued use of the
            site after an update means you accept the new terms.
          </p>
        </>
      )}
    </LegalPage>
  );
}
