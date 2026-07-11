import { prisma } from "@/lib/db";

/** Outbound-click tracking from day one; affiliate later only changes
 *  the destination URL logic in the /go route, not this recording. */
export async function recordOutboundClick(
  offerId: number,
  meta: { referer?: string | null; locale?: string | null } = {},
) {
  await prisma.outboundClick.create({
    data: {
      offerId,
      referer: meta.referer ?? null,
      locale: meta.locale ?? null,
    },
  });
}

export async function reportWrongPrice(offerId: number, comment?: string) {
  await prisma.priceReport.create({
    data: { offerId, comment: comment?.slice(0, 500) ?? null },
  });
}
