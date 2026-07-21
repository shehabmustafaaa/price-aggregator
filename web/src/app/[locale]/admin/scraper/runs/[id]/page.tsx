import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getRunDetail, missingFields, OUTCOME_LABELS } from "@/lib/scraper/audit";
import AdminGate from "@/components/AdminGate";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const OUTCOME_COLOR: Record<string, string> = {
  GRABBED: "text-green-400",
  AUTO_CREATED: "text-emerald-400",
  SKIPPED_ACCESSORY: "text-gray-400",
  REJECTED_PRICE: "text-red-400",
  REVIEW_QUEUED: "text-amber-400",
  ERROR: "text-red-500",
};

/** Per-URL audit for one scrape run: what happened to every scraped URL,
 *  why it was skipped, and which grabbed products still need data. */
export default async function RunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;
  const { outcome } = await searchParams;

  const detail = await getRunDetail(Number(id), outcome);
  if (!detail) notFound();
  const { run, counts, total, events, productMap } = detail;

  const numberLocale = "en-EG";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Run #{run.id} — {run.store.name}
        </h1>
        <Link href="/admin/scraper" className="text-sm text-gray-400 underline">
          ← Scraper control
        </Link>
      </div>

      <p className="text-sm text-gray-400">
        {run.status} · {run.offersSeen} URLs seen ·{" "}
        {run.startedAt.toLocaleString("en-GB")}
        {run.note ? ` · ${run.note}` : ""}
      </p>

      {/* Outcome summary — click to filter the list below */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Filter
          href={`/${locale}/admin/scraper/runs/${run.id}`}
          active={!outcome}
          label={`All (${total})`}
        />
        {(Object.keys(OUTCOME_LABELS) as (keyof typeof OUTCOME_LABELS)[]).map(
          (o) =>
            counts[o] ? (
              <Filter
                key={o}
                href={`/${locale}/admin/scraper/runs/${run.id}?outcome=${o}`}
                active={outcome === o}
                label={`${OUTCOME_LABELS[o]} (${counts[o]})`}
                color={OUTCOME_COLOR[o]}
              />
            ) : null,
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="px-3 py-2 text-start font-medium">Outcome</th>
              <th className="px-3 py-2 text-start font-medium">Title</th>
              <th className="px-3 py-2 text-start font-medium">Price</th>
              <th className="px-3 py-2 text-start font-medium">Reason / needs data</th>
              <th className="px-3 py-2 text-start font-medium">Links</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const p = e.productId ? productMap.get(e.productId) : undefined;
              const needs = p ? missingFields(p) : [];
              return (
                <tr key={String(e.id)} className="border-t border-gray-800 align-top">
                  <td className={`px-3 py-2 whitespace-nowrap ${OUTCOME_COLOR[e.outcome]}`}>
                    {OUTCOME_LABELS[e.outcome]}
                  </td>
                  <td className="px-3 py-2 max-w-md">{e.title}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-300">
                    {e.price != null
                      ? `${Number(e.price).toLocaleString(numberLocale)} EGP`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {e.reason}
                    {needs.length > 0 && (
                      <span className="ms-1 inline-flex flex-wrap gap-1">
                        {needs.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-amber-950 px-1.5 py-0.5 text-xs text-amber-300"
                          >
                            needs {f}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener"
                      className="text-blue-400 underline"
                    >
                      source
                    </a>
                    {p && (
                      <>
                        {" · "}
                        <a
                          href={`/${locale}/admin/catalog/${p.id}`}
                          className="text-amber-400 underline"
                        >
                          edit
                        </a>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {events.length === 0 && (
        <p className="text-sm text-gray-500">
          No per-URL events for this run (events are kept for ~2 days).
        </p>
      )}
    </div>
  );
}

function Filter({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: string;
}) {
  return (
    <a
      href={href}
      className={`rounded-full border px-3 py-1 ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : `bg-gray-900 border-gray-700 hover:border-blue-500 ${color ?? ""}`
      }`}
    >
      {label}
    </a>
  );
}
