import { prisma } from "@/lib/db";

// Data-trust policy: offers not re-verified within this window are never shown.
export const OFFER_STALE_HOURS = 24;

export function freshOfferWhere() {
  return {
    lastSeenAt: {
      gte: new Date(Date.now() - OFFER_STALE_HOURS * 60 * 60 * 1000),
    },
    store: { active: true },
  };
}

/** All catalog reads of offers MUST go through helpers in this module
 *  so the staleness rule is enforced in exactly one place. */
export async function getVisibleOffersForProduct(productId: number) {
  return prisma.offer.findMany({
    where: {
      productVariant: { productId },
      ...freshOfferWhere(),
    },
    include: { store: true, productVariant: true },
    orderBy: { price: "asc" },
  });
}

export async function getOfferForRedirect(offerId: number) {
  // Redirects work even for stale offers (the user clicked a link we showed earlier).
  return prisma.offer.findUnique({ where: { id: offerId } });
}

export async function getPriceHistory(productId: number, days = 90) {
  return prisma.priceHistory.findMany({
    where: {
      offer: { productVariant: { productId } },
      recordedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    },
    orderBy: { recordedAt: "asc" },
    select: { offerId: true, price: true, recordedAt: true, inStock: true },
  });
}
