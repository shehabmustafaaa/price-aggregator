import { NextRequest, NextResponse } from "next/server";
import { claimNextJob } from "@/lib/scraper/jobs";

/** Polled by the scraper daemon: returns the next job to run, or {job:null}. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-ingest-secret");
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const job = await claimNextJob();
  return NextResponse.json({ job });
}
