import { prisma } from "@/lib/db";

/** Scraper control plane. The Python daemon polls claimNextJob(); "Run now"
 *  in /admin/scraper enqueues PENDING jobs; schedules come from per-store
 *  scrapeIntervalMinutes. */

export interface ClaimedJob {
  jobId: number;
  storeSlug: string;
  requestDelaySeconds: number;
}

const STALE_JOB_MINUTES = 30;

export async function claimNextJob(): Promise<ClaimedJob | null> {
  // 0) Self-heal: a job RUNNING longer than STALE_JOB_MINUTES means the
  //    daemon died mid-run — fail it so the store isn't blocked forever.
  await prisma.scrapeJob.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: new Date(Date.now() - STALE_JOB_MINUTES * 60 * 1000) },
    },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      note: `stale: no completion within ${STALE_JOB_MINUTES} min`,
    },
  });

  // 1) Manual "run now" jobs first.
  const pending = await prisma.scrapeJob.findFirst({
    where: { status: "PENDING" },
    orderBy: { requestedAt: "asc" },
    include: { store: true },
  });
  if (pending) {
    await prisma.scrapeJob.update({
      where: { id: pending.id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return {
      jobId: pending.id,
      storeSlug: pending.store.slug,
      requestDelaySeconds: pending.store.requestDelaySeconds,
    };
  }

  // 2) Scheduled runs: any enabled store whose LAST ATTEMPT (job of any
  //    status) is older than its interval. Keying on the last attempt — not
  //    the last successful run — means a store that keeps failing (e.g. no
  //    Playwright, or an IP block) backs off for a full interval instead of
  //    being re-claimed on every poll (which floods the jobs table).
  const stores = await prisma.store.findMany({
    where: { active: true, scrapeEnabled: true },
  });
  for (const store of stores) {
    const lastJob = await prisma.scrapeJob.findFirst({
      where: { storeId: store.id },
      orderBy: { requestedAt: "desc" },
    });
    if (lastJob?.status === "RUNNING") continue; // already being scraped
    const lastAttempt = lastJob?.startedAt ?? lastJob?.requestedAt ?? null;
    const due =
      !lastAttempt ||
      Date.now() - lastAttempt.getTime() >
        store.scrapeIntervalMinutes * 60 * 1000;
    if (!due) continue;
    const job = await prisma.scrapeJob.create({
      data: {
        storeId: store.id,
        status: "RUNNING",
        trigger: "schedule",
        startedAt: new Date(),
      },
    });
    return {
      jobId: job.id,
      storeSlug: store.slug,
      requestDelaySeconds: store.requestDelaySeconds,
    };
  }
  return null;
}

export async function completeJob(
  jobId: number,
  status: "DONE" | "FAILED",
  note?: string,
) {
  await prisma.scrapeJob.update({
    where: { id: jobId },
    data: { status, finishedAt: new Date(), note: note?.slice(0, 500) ?? null },
  });
}

export async function requestRun(storeId: number) {
  const existing = await prisma.scrapeJob.findFirst({
    where: { storeId, status: { in: ["PENDING", "RUNNING"] } },
  });
  if (existing) return existing;
  return prisma.scrapeJob.create({ data: { storeId, trigger: "manual" } });
}

export async function updateStoreScrapeConfig(
  storeId: number,
  config: {
    scrapeEnabled: boolean;
    scrapeIntervalMinutes: number;
    requestDelaySeconds: number;
  },
) {
  await prisma.store.update({
    where: { id: storeId },
    data: {
      scrapeEnabled: config.scrapeEnabled,
      scrapeIntervalMinutes: Math.max(15, config.scrapeIntervalMinutes),
      requestDelaySeconds: Math.max(1, config.requestDelaySeconds),
    },
  });
}

export async function getScraperOverview() {
  const [stores, jobs, runs] = await Promise.all([
    prisma.store.findMany({ orderBy: { id: "asc" } }),
    prisma.scrapeJob.findMany({
      orderBy: { id: "desc" },
      take: 20,
      include: { store: { select: { name: true } } },
    }),
    prisma.scrapeRun.findMany({
      orderBy: { id: "desc" },
      take: 20,
      include: { store: { select: { name: true } } },
    }),
  ]);
  return { stores, jobs, runs };
}
