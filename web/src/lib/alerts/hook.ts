import { prisma } from "@/lib/db";
import { registerPostIngestHook, type PriceChangeEvent } from "@/lib/ingest/hooks";
import { sendAlertEmail } from "./email";

const REFIRE_COOLDOWN_H = 24;

/** Post-ingest hook: fire alerts whose target price is now met.
 *  Registered once via the side-effect import in the ingest pipeline. */
async function checkAlerts(events: PriceChangeEvent[]) {
  for (const event of events) {
    // Only drops (or first sightings) can satisfy an alert.
    if (event.oldPrice !== null && event.newPrice >= event.oldPrice) continue;

    const variant = await prisma.productVariant.findUnique({
      where: { id: event.offer.productVariantId },
      include: { product: true },
    });
    if (!variant) continue;

    const alerts = await prisma.priceAlert.findMany({
      where: {
        productId: variant.productId,
        active: true,
        targetPrice: { gte: event.newPrice },
        OR: [
          { lastFiredAt: null },
          {
            lastFiredAt: {
              lt: new Date(Date.now() - REFIRE_COOLDOWN_H * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: { user: true },
    });

    for (const alert of alerts) {
      const isAr = alert.user.locale === "ar";
      const name = isAr ? variant.product.nameAr : variant.product.nameEn;
      const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${alert.user.locale}/p/${variant.product.slug}`;
      const price = event.newPrice.toLocaleString(isAr ? "ar-EG" : "en-EG");
      const subject = isAr
        ? `انخفض سعر ${name} إلى ${price} جنيه`
        : `${name} dropped to ${price} EGP`;
      const html = isAr
        ? `<p>انخفض سعر <b>${name}</b> إلى <b>${price} جنيه</b>.</p><p><a href="${url}">شاهد العروض</a></p>`
        : `<p><b>${name}</b> is now <b>${price} EGP</b>.</p><p><a href="${url}">See the offers</a></p>`;
      try {
        await sendAlertEmail(alert.user.email, subject, html);
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastFiredAt: new Date() },
        });
      } catch (err) {
        console.error(`alert ${alert.id} email failed`, err);
      }
    }
  }
}

registerPostIngestHook(checkAlerts);
