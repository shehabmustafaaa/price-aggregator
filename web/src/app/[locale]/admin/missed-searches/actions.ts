"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { dismissMissedSearch } from "@/lib/admin/missedSearches";

/** Dismiss a missed-search term (deletes all its logged occurrences). */
export async function dismissAction(formData: FormData) {
  if (!(await getAdminUser())) return;
  const normalized = String(formData.get("normalized") || "");
  if (!normalized) return;
  await dismissMissedSearch(normalized);
  revalidatePath("/admin/missed-searches");
}
