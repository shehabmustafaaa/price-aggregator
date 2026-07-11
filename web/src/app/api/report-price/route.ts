import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportWrongPrice } from "@/lib/tracking/clicks";

const schema = z.object({
  offerId: z.number().int().positive(),
  comment: z.string().max(500).optional(),
});

/** "Report wrong price" — no login required. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await reportWrongPrice(parsed.data.offerId, parsed.data.comment);
  return NextResponse.json({ ok: true });
}
