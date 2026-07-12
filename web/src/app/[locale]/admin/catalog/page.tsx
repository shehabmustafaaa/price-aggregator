import { setRequestLocale } from "next-intl/server";
import { listProductsForAdmin } from "@/lib/admin/catalog";
import {
  deleteProductAction,
  mergeProductAction,
  updateProductAction,
} from "./actions";

export const dynamic = "force-dynamic";

/** Catalog quality tool (English-only, key-protected):
 *  /admin/catalog?key=<ADMIN_SECRET>&q=<search>
 *  Edit names/slugs, delete junk (accessories), merge duplicates. */
export default async function CatalogAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ key?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { key, q = "" } = await searchParams;

  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    return <p className="text-red-400">Unauthorized — append ?key=…</p>;
  }

  const products = await listProductsForAdmin(q);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Catalog ({products.length} shown)</h1>

      <form method="get" className="flex gap-2 text-sm">
        <input type="hidden" name="key" value={key} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or slug…"
          className="w-72 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5"
        />
        <button className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 hover:border-blue-500">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {products.map((p) => {
          const offerCount = p.variants.reduce(
            (sum, v) => sum + v._count.offers,
            0,
          );
          return (
            <div
              key={p.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="font-mono">#{p.id}</span>
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt=""
                    className="h-10 w-10 rounded bg-white object-contain p-0.5"
                  />
                )}
                <span>{p.brand?.name ?? "no brand"}</span>
                <span>{p.variants.length} variants</span>
                <span>{offerCount} offers</span>
                <a
                  href={`/${locale}/p/${p.slug}`}
                  target="_blank"
                  className="text-blue-400 underline"
                >
                  view
                </a>
              </div>

              <form
                action={updateProductAction}
                className="flex flex-wrap items-end gap-2 text-sm"
              >
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="productId" value={p.id} />
                <Field name="nameEn" label="Name (EN)" defaultValue={p.nameEn} wide />
                <Field name="nameAr" label="Name (AR)" defaultValue={p.nameAr} wide />
                <Field name="slug" label="Slug" defaultValue={p.slug} />
                <button className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 hover:border-blue-500">
                  Save
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <form action={mergeProductAction} className="flex items-center gap-2">
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="productId" value={p.id} />
                  <input
                    type="number"
                    name="targetId"
                    placeholder="target #id"
                    className="w-28 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                  <button className="text-amber-400 underline hover:text-amber-300">
                    Merge into target
                  </button>
                </form>
                <form action={deleteProductAction}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="productId" value={p.id} />
                  <button className="text-gray-500 underline hover:text-red-400">
                    Delete product + offers
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
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
