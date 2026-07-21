import { prisma } from "@/lib/db";
import type { IngestOutcome } from "@/generated/prisma/client";

export const OUTCOME_LABELS: Record<IngestOutcome, string> = {
  GRABBED: "Grabbed",
  AUTO_CREATED: "Auto-created",
  SKIPPED_ACCESSORY: "Skipped (accessory)",
  REJECTED_PRICE: "Rejected (price)",
  REVIEW_QUEUED: "Sent to review",
  ERROR: "Error",
};

/** Which product fields still have no data — drives the "needs data" badges. */
export function missingFields(p: {
  images: string[];
  specs: unknown;
  descriptionEn: string | null;
  descriptionAr: string | null;
  brandId: number | null;
}): string[] {
  const m: string[] = [];
  if (!p.images || p.images.length === 0) m.push("images");
  if (!p.specs || Object.keys(p.specs as object).length === 0) m.push("specs");
  if (!p.descriptionEn && !p.descriptionAr) m.push("description");
  if (!p.brandId) m.push("brand");
  return m;
}

export async function getRunDetail(runId: number, outcomeFilter?: string) {
  const run = await prisma.scrapeRun.findUnique({
    where: { id: runId },
    include: { store: true },
  });
  if (!run) return null;

  // Counts per outcome (for the summary chips) — always the full run.
  const grouped = await prisma.ingestEvent.groupBy({
    by: ["outcome"],
    where: { runId },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(
    grouped.map((g) => [g.outcome, g._count._all]),
  ) as Record<IngestOutcome, number>;
  const total = grouped.reduce((s, g) => s + g._count._all, 0);

  // The (optionally filtered) event list, capped for the page.
  const events = await prisma.ingestEvent.findMany({
    where: {
      runId,
      ...(outcomeFilter ? { outcome: outcomeFilter as IngestOutcome } : {}),
    },
    orderBy: { id: "asc" },
    take: 500,
  });

  // Product completeness for grabbed/created items.
  const productIds = [
    ...new Set(events.map((e) => e.productId).filter((x): x is number => !!x)),
  ];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          slug: true,
          nameEn: true,
          images: true,
          specs: true,
          descriptionEn: true,
          descriptionAr: true,
          brandId: true,
        },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  return { run, counts, total, events, productMap };
}
