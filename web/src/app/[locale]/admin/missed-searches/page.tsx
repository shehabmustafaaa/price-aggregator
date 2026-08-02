import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import { aggregateMissedSearches } from "@/lib/admin/missedSearches";
import AdminGate from "@/components/AdminGate";
import { dismissAction } from "./actions";

export const dynamic = "force-dynamic";

/** Internal missed-search insight tool (English-only, admins only):
 *  /admin/missed-searches. Read-only ranked list of zero-result queries the
 *  owner can act on, plus a dismiss button. No catalog/scraper writes. */
export default async function MissedSearchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;

  const rows = await aggregateMissedSearches(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          Missed searches ({rows.length} shown)
        </h1>
        <p className="text-sm text-gray-400">
          Zero-result searches, grouped by normalized term and ranked by how
          often they were searched — the demand gaps to fill next.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
          No missed searches yet. When a shopper searches and finds nothing,
          it shows up here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-2">Term</th>
                <th className="px-4 py-2">Count</th>
                <th className="px-4 py-2">Locale(s)</th>
                <th className="px-4 py-2">Last searched</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.normalized}
                  className="border-t border-gray-800 align-middle"
                >
                  <td className="px-4 py-2 font-medium">{r.term}</td>
                  <td className="px-4 py-2 tabular-nums">{r.count}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {r.locales.join(", ")}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {r.lastSearchedAt.toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={dismissAction}>
                      <input
                        type="hidden"
                        name="normalized"
                        value={r.normalized}
                      />
                      <button
                        type="submit"
                        className="text-gray-500 underline hover:text-red-400"
                      >
                        Dismiss
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
