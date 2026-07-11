import { NextRequest, NextResponse } from "next/server";
import { getOfferForRedirect } from "@/lib/catalog/offers";
import { recordOutboundClick } from "@/lib/tracking/clicks";

/** Outbound redirect with click tracking. When affiliate programs arrive,
 *  only the destination URL logic here changes. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await params;
  const id = Number(offerId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "bad offer id" }, { status: 400 });
  }

  const offer = await getOfferForRedirect(id);
  if (!offer) {
    return NextResponse.json({ error: "offer not found" }, { status: 404 });
  }

  await recordOutboundClick(id, {
    referer: req.headers.get("referer"),
    locale: req.cookies.get("NEXT_LOCALE")?.value ?? null,
  });

  return NextResponse.redirect(offer.url, 302);
}
