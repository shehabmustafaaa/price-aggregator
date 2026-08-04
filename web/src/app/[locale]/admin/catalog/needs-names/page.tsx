import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import {
  listProductsNeedingNames,
  type NeedsNameProduct,
} from "@/lib/admin/name-cleanup";
import AdminGate from "@/components/AdminGate";
import { Link } from "@/i18n/navigation";
import { fixNamesAction } from "./actions";

export const dynamic = "force-dynamic";

/** Editorial name-cleanup tool (English-only, admins only):
 *  /admin/catalog/needs-names. Lists products whose English name is still raw
 *  Arabic (from auto-creation); fix inline and the row drops off once the
 *  English name has no Arabic characters. */
export default async function NeedsNamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;

  const products = await listProductsNeedingNames(100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            Needs translation ({products.length} shown)
          </h1>
          <p className="text-sm text-gray-400">
            Auto-created products whose English name is still Arabic. Give each a
            proper English name; the row disappears once it has no Arabic.
          </p>
        </div>
        <Link
          href="/admin/catalog"
          className="text-sm text-blue-400 underline hover:text-blue-300"
        >
          ← Back to catalog
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
          Nothing to clean up — every English name is already Latin.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Row key={p.id} p={p} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ p, locale }: { p: NeedsNameProduct; locale: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span className="font-mono">#{p.id}</span>
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt=""
            className="h-10 w-10 rounded bg-white object-contain p-0.5"
          />
        )}
        <span>{p.brandName ?? "no brand"}</span>
        <span>{p.variantCount} variants</span>
        <span>{p.offerCount} offers</span>
        <a
          href={`/${locale}/p/${p.slug}`}
          target="_blank"
          className="text-blue-400 underline"
        >
          view
        </a>
        <a
          href={`/${locale}/admin/catalog/${p.id}`}
          className="text-amber-400 underline"
        >
          full edit
        </a>
      </div>

      <form
        action={fixNamesAction}
        className="flex flex-wrap items-end gap-2 text-sm"
      >
        <input type="hidden" name="productId" value={p.id} />
        <Field name="nameEn" label="Name (EN)" defaultValue={p.nameEn} wide />
        <Field name="nameAr" label="Name (AR)" defaultValue={p.nameAr} wide />
        <Field name="slug" label="Slug" defaultValue={p.slug} />
        <button className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 hover:border-blue-500">
          Save
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  wide,
}: {
  name: string;
  label: string;
  defaultValue: string;
  wide?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className={`${wide ? "w-80" : "w-48"} rounded-lg border border-gray-700 bg-gray-950 px-2 py-1`}
      />
    </label>
  );
}
