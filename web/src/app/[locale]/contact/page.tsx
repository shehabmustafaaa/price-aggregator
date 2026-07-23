import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import LegalPage from "@/components/LegalPage";
import ContactForm from "@/components/ContactForm";
import { getContactEmail } from "@/lib/contact/send";

export const metadata: Metadata = { title: "Contact / اتصل بنا" };

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";
  const t = await getTranslations({ locale, namespace: "contact" });
  const email = getContactEmail();

  return (
    <LegalPage title={ar ? "اتصل بنا" : "Contact Us"}>
      {ar ? (
        <p>
          راسلنا لأي استفسار عام، أو للإبلاغ عن سعر خاطئ، أو لطلب حذف أو تعديل
          منتج معروض على الموقع. سنرد في أقرب وقت.
        </p>
      ) : (
        <p>
          Reach out for general questions, to report a wrong price, or to
          request removal or correction of a listing shown on the site.
          We&apos;ll reply as soon as we can.
        </p>
      )}
      <ContactForm fallbackEmail={email} />
      {email && (
        <p>
          {t("fallback")}
          <a href={`mailto:${email}`}>{email}</a>
        </p>
      )}
    </LegalPage>
  );
}
