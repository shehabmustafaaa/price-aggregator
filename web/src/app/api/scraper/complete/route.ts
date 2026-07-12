import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeJob } from "@/lib/scraper/jobs";

const schema = z.object({
  job_id: z.number().int().positive(),
  status: z.enum(["DONE", "FAILED"]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-ingest-secret");
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await completeJob(parsed.data.job_id, parsed.data.status, parsed.data.note);
  return NextResponse.json({ ok: true });
}
