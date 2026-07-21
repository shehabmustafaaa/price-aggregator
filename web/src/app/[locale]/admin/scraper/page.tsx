import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getScraperOverview } from "@/lib/scraper/jobs";
import { AUTO_APPROVE_KEY, getBoolSetting } from "@/lib/settings";
import AdminGate from "@/components/AdminGate";
import { runNowAction, saveAllAction } from "./actions";

export const dynamic = "force-dynamic";

/** Scraper control + audit (English-only, admins only): /admin/scraper */
export default async function ScraperAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; queued?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;
  const { saved, queued } = await searchParams;

  const { stores, jobs, runs } = await getScraperOverview();
  const autoApprove = await getBoolSetting(AUTO_APPROVE_KEY, true);
  const storeIds = stores.map((s) => s.id).join(",");

  const numberInput =
    "w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1";

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Scraper control</h1>
          {saved && (
            <span className="text-sm text-green-400">Settings saved.</span>
          )}
          {queued && (
            <span className="text-sm text-blue-400">Run queued.</span>
          )}
        </div>

        {/* One form holds every setting. Config inputs live inside the store
            rows but belong to this form via form="scraper-config" (HTML5), so
            there is a single Save for the whole panel. */}
        <form id="scraper-config" action={saveAllAction} />
        <input type="hidden" name="storeIds" value={storeIds} form="scraper-config" />
        <input type="hidden" name="locale" value={locale} form="scraper-config" />

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="autoApprove"
              defaultChecked={autoApprove}
              form="scraper-config"
            />
            <span className="font-medium">
              Auto-approve unmatched offers (create products automatically)
            </span>
          </label>
          <span className="text-gray-400">
            When off, unmatched offers wait in the match-review queue instead.
          </span>
        </div>

        <div className="space-y-3">
          {stores.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-wrap items-end gap-4"
            >
              <div className="min-w-40">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-400">{s.domain}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`enabled_${s.id}`}
                  defaultChecked={s.scrapeEnabled}
                  form="scraper-config"
                />
                <span className="text-gray-300">enabled</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-gray-400">interval (min)</span>
                <input
                  type="number"
                  name={`interval_${s.id}`}
                  min={15}
                  defaultValue={s.scrapeIntervalMinutes}
                  form="scraper-config"
                  className={numberInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-gray-400">request delay (s)</span>
                <input
                  type="number"
                  name={`delay_${s.id}`}
                  min={1}
                  step={0.5}
                  defaultValue={s.requestDelaySeconds}
                  form="scraper-config"
                  className={numberInput}
                />
              </label>
              {/* Run now is its own form (a separate action). */}
              <form action={runNowAction} className="ms-auto">
                <input type="hidden" name="storeId" value={s.id} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  Run now
                </button>
              </form>
            </div>
          ))}
        </div>

        <button
          type="submit"
          form="scraper-config"
          className="mt-4 rounded-lg bg-green-700 px-5 py-2 text-sm text-white hover:bg-green-600"
        >
          Save all settings
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Jobs (last 20)</h2>
        <p className="text-xs text-gray-500 mb-2">
          The work queue — a request to scrape a store (from a schedule or
          &quot;Run now&quot;) and whether the grabber finished it.
        </p>
        <AuditTable
          headers={["#", "Store", "Trigger", "Status", "Requested", "Finished", "Note"]}
          rows={jobs.map((j) => [
            String(j.id),
            j.store.name,
            j.trigger,
            j.status,
            j.requestedAt.toLocaleString("en-GB"),
            j.finishedAt?.toLocaleString("en-GB") ?? "—",
            j.note ?? "",
          ])}
          statusIndex={3}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Scrape runs (last 20)</h2>
        <p className="text-xs text-gray-500 mb-2">
          The result — what the ingest did with the scraped data. Click a run
          number for the per-URL breakdown.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                {["#", "Store", "Status", "Seen", "Upserted", "Rejects", "Parse err", "Started", "Note"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 text-start font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">
                    <a
                      href={`/${locale}/admin/scraper/runs/${r.id}`}
                      className="text-blue-400 underline"
                    >
                      {r.id}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{r.store.name}</td>
                  <td className={`px-3 py-2 ${statusColor(r.status)}`}>{r.status}</td>
                  <td className="px-3 py-2 text-gray-300">{r.offersSeen}</td>
                  <td className="px-3 py-2 text-gray-300">{r.offersUpserted}</td>
                  <td className="px-3 py-2 text-gray-300">{r.rejects}</td>
                  <td className="px-3 py-2 text-gray-300">{r.parseErrors}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {r.startedAt.toLocaleString("en-GB")}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{r.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AuditTable({
  headers,
  rows,
  statusIndex,
}: {
  headers: string[];
  rows: string[][];
  statusIndex: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-800">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${
                    j === statusIndex ? statusColor(cell) : "text-gray-300"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "DONE":
    case "SUCCESS":
      return "text-green-400";
    case "FAILED":
      return "text-red-400";
    case "PARTIAL":
      return "text-amber-400";
    case "RUNNING":
      return "text-blue-400";
    default:
      return "text-gray-400";
  }
}
