import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import {
  findDuplicateCandidates,
  type DupProduct,
} from "@/lib/admin/duplicates";
import AdminGate from "@/components/AdminGate";
import { mergeAction, dismissAction } from "./actions";

export const dynamic = "force-dynamic";

/** Internal duplicate-detection tool (English-only, admins only):
 *  /admin/catalog/duplicates. Ranked likely-duplicate product pairs with
 *  one-click merge (existing merge tool) or "not a duplicate" dismiss.
 *  Read-only apart from those two actions. */
export default async function DuplicatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;

  const pairs = await findDuplicateCandidates(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          Duplicate suggestions ({pairs.length} shown)
        </h1>
        <p className="text-sm text-gray-400">
          Same-category products that look like the same phone, most likely
          first. Merge to combine them, or dismiss a false positive.
        </p>
      </div>

      {pairs.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
          No likely duplicates found. Auto-created near-dupes will show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {pairs.map(({ a, b, score }) => (
            <div
              key={`${a.id}:${b.id}`}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4"
            >
              <div className="mb-3 text-xs text-gray-500">
                similarity {Math.round(score * 100)}%
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProductCol p={a} />
                <ProductCol p={b} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-800 pt-3 text-sm">
                <form action={mergeAction}>
                  <input type="hidden" name="survivorId" value={a.id} />
                  <input type="hidden" name="absorbedId" value={b.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-700 px-3 py-1.5 text-white hover:bg-green-600"
                  >
                    Merge → keep “{a.nameEn}”
                  </button>
                </form>
                <form action={mergeAction}>
                  <input type="hidden" name="survivorId" value={b.id} />
                  <input type="hidden" name="absorbedId" value={a.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-700 px-3 py-1.5 text-white hover:bg-green-600"
                  >
                    Merge → keep “{b.nameEn}”
                  </button>
                </form>
                <form action={dismissAction} className="ms-auto">
                  <input type="hidden" name="aId" value={a.id} />
                  <input type="hidden" name="bId" value={b.id} />
                  <button
                    type="submit"
                    className="text-gray-500 underline hover:text-red-400"
                  >
                    Not a duplicate
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCol({ p }: { p: DupProduct }) {
  return (
    <div className="flex gap-3">
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.image}
          alt=""
          className="h-16 w-16 shrink-0 rounded bg-white object-contain p-0.5"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded bg-gray-800" />
      )}
      <div className="min-w-0 text-sm">
        <p className="font-medium">{p.nameEn}</p>
        <p className="text-gray-400" dir="rtl">
          {p.nameAr}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          #{p.id} · {p.brandName ?? "no brand"} · {p.offerCount} offers ·{" "}
          {p.variantCount} variants
        </p>
      </div>
    </div>
  );
}
