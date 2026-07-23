import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy / سياسة الخصوصية" };

const contactEmail = () =>
  process.env.CONTACT_EMAIL || process.env.SMTP_FROM || "";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";
  const email = contactEmail();

  return (
    <LegalPage title={ar ? "سياسة الخصوصية" : "Privacy Policy"}>
      {ar ? (
        <>
          <p>
            نحترم خصوصيتك. توضح هذه الصفحة البيانات التي يجمعها موقع أسعار
            وكيفية استخدامها.
          </p>
          <h2>البيانات التي نجمعها</h2>
          <p>
            <strong>الحسابات:</strong> عند إنشاء حساب نحفظ بريدك الإلكتروني
            وكلمة المرور (مشفّرة) واللغة المفضلة. الحساب اختياري — يمكنك تصفح
            الموقع ومقارنة الأسعار بدون حساب.
          </p>
          <p>
            <strong>المفضلة وتنبيهات الأسعار:</strong> إذا أضفت منتجاً للمفضلة
            أو أنشأت تنبيه سعر، نحفظ ذلك مع حسابك لنرسل لك إشعاراً عند انخفاض
            السعر.
          </p>
          <p>
            <strong>سجل النقرات:</strong> عند الضغط على &quot;اذهب
            للمتجر&quot; نسجل النقرة (المنتج والمتجر والوقت) لفهم استخدام
            الموقع وتحسينه.
          </p>
          <p>
            <strong>سجل البحث:</strong> عندما لا يجد بحثك أي نتائج نسجل كلمة
            البحث حتى نضيف المنتجات المطلوبة لاحقاً.
          </p>
          <p>
            <strong>ملفات تعريف الارتباط (الكوكيز):</strong> نستخدم كوكي جلسة
            لتسجيل الدخول فقط. لا نستخدم كوكيز تتبع خاصة بنا.
          </p>
          <h2>الإعلانات (Google AdSense)</h2>
          <p>
            قد نعرض إعلانات عبر Google AdSense. عندما تكون الإعلانات مفعّلة،
            قد تستخدم Google وشركاؤها كوكيز ومعرّفات إعلانية لعرض إعلانات
            مناسبة لك. يمكنك معرفة المزيد وإدارة تفضيلاتك من إعدادات إعلانات
            Google.
          </p>
          <h2>كيف نستخدم البيانات</h2>
          <p>
            نستخدم البيانات لتشغيل الموقع وتحسينه وإرسال التنبيهات التي طلبتها
            فقط. لا نبيع بياناتك لأي طرف ثالث.
          </p>
          <h2>تواصل معنا</h2>
          <p>
            لأي استفسار عن الخصوصية أو لطلب حذف بياناتك، راسلنا عبر{" "}
            <a href={`/${locale}/contact`}>صفحة اتصل بنا</a>
            {email ? (
              <>
                {" "}
                أو مباشرة على <a href={`mailto:${email}`}>{email}</a>
              </>
            ) : null}
            .
          </p>
        </>
      ) : (
        <>
          <p>
            We respect your privacy. This page explains what data Asaar
            collects and how it is used.
          </p>
          <h2>Data we collect</h2>
          <p>
            <strong>Accounts:</strong> when you create an account we store your
            email address, password (hashed), and preferred language. An
            account is optional — you can browse and compare prices without
            one.
          </p>
          <p>
            <strong>Favorites and price alerts:</strong> if you favorite a
            product or set a price alert, we store that with your account so we
            can notify you when the price drops.
          </p>
          <p>
            <strong>Click log:</strong> when you click &quot;Go to Shop&quot;
            we log the click (product, store, time) to understand and improve
            how the site is used.
          </p>
          <p>
            <strong>Search log:</strong> when a search returns no results we
            log the search term so we can add missing products later.
          </p>
          <p>
            <strong>Cookies:</strong> we use a session cookie for sign-in only.
            We do not use tracking cookies of our own.
          </p>
          <h2>Advertising (Google AdSense)</h2>
          <p>
            We may show ads via Google AdSense. When ads are live, Google and
            its partners may use cookies and advertising identifiers to show
            ads relevant to you. You can learn more and manage your preferences
            in Google&apos;s Ads Settings.
          </p>
          <h2>How we use data</h2>
          <p>
            We use this data only to run and improve the site and to send the
            alerts you asked for. We do not sell your data to third parties.
          </p>
          <h2>Contact us</h2>
          <p>
            For any privacy question or to request deletion of your data, reach
            us via the <a href={`/${locale}/contact`}>Contact page</a>
            {email ? (
              <>
                {" "}
                or directly at <a href={`mailto:${email}`}>{email}</a>
              </>
            ) : null}
            .
          </p>
        </>
      )}
    </LegalPage>
  );
}
