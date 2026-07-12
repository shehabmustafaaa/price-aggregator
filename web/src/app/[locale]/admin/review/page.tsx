import { setRequestLocale } from "next-intl/server";
import { listPendingReviews } from "@/lib/admin/review";
import type { RawOffer } from "@/lib/ingest/schema";
import { approveAction, rejectAction } from "./actions";

export const dynamic = "force-dynamic";

/** Internal match-review tool (English-only, key-protected):
 *  /admin/review?key=<ADMIN_SECRET> */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { key } = await searchParams;

  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    return <p className="text-red-400">Unauthorized — append ?key=…</p>;
  }

  const reviews = await listPendingReviews(30);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        Match review queue ({reviews.length} shown)
      </h1>
      {reviews.map(({ representative: r, variantCount }) => {
        const raw = r.rawPayload as unknown as RawOffer;
        return (
          <div
            key={r.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-3">
              {raw.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={raw.image_url}
                  alt=""
                  className="h-14 w-14 rounded bg-white object-contain p-0.5"
                />
              )}
              <div className="flex-1 min-w-60">
                <p className="font-medium">
                  {r.rawTitle}
                  {variantCount > 1 && (
                    <span className="ms-2 rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-300">
                      +{variantCount - 1} variants
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {Number(raw.price).toLocaleString("en-EG")} EGP ·{" "}
                  {raw.brand ?? "no brand"} · attrs{" "}
                  {JSON.stringify(raw.attrs ?? {})} · confidence{" "}
                  {r.confidence.toFixed(2)}
                </p>
                <a
                  href={r.rawUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-blue-400 underline"
                >
                  {r.rawUrl}
                </a>
              </div>
            </div>
            <form
              action={approveAction}
              className="flex flex-wrap items-end gap-2 text-sm"
            >
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="reviewId" value={r.id} />
              <input type="hidden" name="categorySlug" value="mobile-phones" />
              <Field name="nameEn" label="Name (EN)" />
              <Field name="nameAr" label="Name (AR)" defaultValue={r.rawTitle.split(" - ")[0]} />
              <Field name="slug" label="Slug" />
              <Field name="brandName" label="Brand" defaultValue={raw.brand ?? ""} />
              <button
                type="submit"
                className="rounded-lg bg-green-700 px-3 py-1.5 text-white hover:bg-green-600"
              >
                Create product
              </button>
            </form>
            <form action={rejectAction} className="text-sm">
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="reviewId" value={r.id} />
              <button
                type="submit"
                className="text-gray-500 underline hover:text-red-400"
              >
                Reject
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-48 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1"
      />
    </label>
  );
}
