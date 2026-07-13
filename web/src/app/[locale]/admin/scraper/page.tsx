import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getScraperOverview } from "@/lib/scraper/jobs";
import { AUTO_APPROVE_KEY, getBoolSetting } from "@/lib/settings";
import AdminGate from "@/components/AdminGate";
import {
  runNowAction,
  toggleAutoApproveAction,
  updateConfigAction,
} from "./actions";

export const dynamic = "force-dynamic";

/** Scraper control + audit (English-only, admins only): /admin/scraper */
export default async function ScraperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;

  const { stores, jobs, runs } = await getScraperOverview();
  const autoApprove = await getBoolSetting(AUTO_APPROVE_KEY, true);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-bold mb-4">Scraper control</h1>

        <form
          action={toggleAutoApproveAction}
          className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-wrap items-center gap-3 text-sm"
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="autoApprove"
              defaultChecked={autoApprove}
            />
            <span className="font-medium">
              Auto-approve unmatched offers (create products automatically)
            </span>
          </label>
          <span className="text-gray-400">
            When off, unmatched offers wait in the match-review queue instead.
          </span>
          <button
            type="submit"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 hover:border-blue-500"
          >
            Save
          </button>
        </form>
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
              <form
                action={updateConfigAction}
                className="flex flex-wrap items-end gap-3 text-sm"
              >
                      <input type="hidden" name="storeId" value={s.id} />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="scrapeEnabled"
                    defaultChecked={s.scrapeEnabled}
                  />
                  <span className="text-gray-300">enabled</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">interval (min)</span>
                  <input
                    type="number"
                    name="intervalMinutes"
                    min={15}
                    defaultValue={s.scrapeIntervalMinutes}
                    className="w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">
                    request delay (s)
                  </span>
                  <input
                    type="number"
                    name="delaySeconds"
                    min={1}
                    step={0.5}
                    defaultValue={s.requestDelaySeconds}
                    className="w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 hover:border-blue-500"
                >
                  Save
                </button>
              </form>
              <form action={runNowAction}>
                      <input type="hidden" name="storeId" value={s.id} />
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
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Jobs (last 20)</h2>
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
        <AuditTable
          headers={["#", "Store", "Status", "Seen", "Upserted", "Rejects", "Parse err", "Started", "Note"]}
          rows={runs.map((r) => [
            String(r.id),
            r.store.name,
            r.status,
            String(r.offersSeen),
            String(r.offersUpserted),
            String(r.rejects),
            String(r.parseErrors),
            r.startedAt.toLocaleString("en-GB"),
            r.note ?? "",
          ])}
          statusIndex={2}
        />
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
