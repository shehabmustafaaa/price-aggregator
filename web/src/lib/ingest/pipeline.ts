import { prisma } from "@/lib/db";
import type { IngestPayload } from "./schema";
import { matchOffer } from "./match";
import { isPriceSane } from "./sanity";
import { runPostIngestHooks, type PriceChangeEvent } from "./hooks";

export interface IngestResult {
  scrapeRunId: number;
  offersSeen: number;
  offersUpserted: number;
  rejects: number;
  sentToReview: number;
}

/** Ingest pipeline: normalize → match → sanity → upsert (+price history) → hooks.
 *  Called by /api/ingest; the scraper never touches the DB directly. */
export async function ingest(payload: IngestPayload): Promise<IngestResult> {
  const store = await prisma.store.findUnique({
    where: { slug: payload.store_slug },
  });
  if (!store) throw new Error(`Unknown store: ${payload.store_slug}`);

  const category = await prisma.category.findUnique({
    where: { slug: payload.category_slug },
  });
  if (!category) throw new Error(`Unknown category: ${payload.category_slug}`);

  const run = await prisma.scrapeRun.create({
    data: {
      storeId: store.id,
      startedAt: payload.run_started_at
        ? new Date(payload.run_started_at)
        : new Date(),
      parseErrors: payload.parse_errors,
    },
  });

  let upserted = 0;
  let rejects = 0;
  let sentToReview = 0;
  const events: PriceChangeEvent[] = [];

  for (const raw of payload.offers) {
    try {
      const existing = await prisma.offer.findUnique({
        where: { storeId_url: { storeId: store.id, url: raw.url } },
      });

      if (!isPriceSane(existing, raw.price)) {
        rejects++;
        await prisma.matchReview.create({
          data: {
            storeId: store.id,
            rawTitle: raw.title,
            rawUrl: raw.url,
            rawPayload: JSON.parse(JSON.stringify(raw)),
            suggestedProductVariantId: existing?.productVariantId ?? null,
            confidence: 0,
            status: "pending",
          },
        });
        continue;
      }

      let productVariantId = existing?.productVariantId ?? null;
      if (!productVariantId) {
        const match = await matchOffer(raw, category.id);
        if (!match.productVariantId) {
          sentToReview++;
          const alreadyQueued = await prisma.matchReview.findFirst({
            where: { storeId: store.id, rawUrl: raw.url, status: "pending" },
          });
          if (!alreadyQueued) {
            await prisma.matchReview.create({
              data: {
                storeId: store.id,
                rawTitle: raw.title,
                rawUrl: raw.url,
                rawPayload: JSON.parse(JSON.stringify(raw)),
                confidence: match.confidence,
                status: "pending",
              },
            });
          }
          continue;
        }
        productVariantId = match.productVariantId;
      }

      // The offer is attached to a product — clear any review rows queued
      // for it before the catalog knew this product.
      await prisma.matchReview.updateMany({
        where: { storeId: store.id, rawUrl: raw.url, status: "pending" },
        data: { status: "approved" },
      });

      const oldPrice = existing ? Number(existing.price) : null;
      const now = new Date();

      const offer = await prisma.offer.upsert({
        where: { storeId_url: { storeId: store.id, url: raw.url } },
        create: {
          productVariantId,
          storeId: store.id,
          url: raw.url,
          titleRaw: raw.title,
          price: raw.price,
          shippingCost: raw.shipping_cost ?? null,
          currency: raw.currency,
          inStock: raw.in_stock,
          condition: raw.condition,
          warrantyType: raw.warranty_type,
          regionVersion: raw.region_version ?? null,
          attrs: JSON.parse(JSON.stringify(raw.attrs ?? {})),
          lastSeenAt: now,
        },
        update: {
          titleRaw: raw.title,
          attrs: JSON.parse(JSON.stringify(raw.attrs ?? {})),
          price: raw.price,
          shippingCost: raw.shipping_cost ?? null,
          inStock: raw.in_stock,
          condition: raw.condition,
          warrantyType: raw.warranty_type,
          regionVersion: raw.region_version ?? null,
          lastSeenAt: now,
        },
      });

      // Backfill product images from the store listing if we have none.
      const listingImages =
        raw.image_urls.length > 0
          ? raw.image_urls
          : raw.image_url
            ? [raw.image_url]
            : [];
      if (listingImages.length > 0) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: productVariantId },
          include: { product: { select: { id: true, images: true } } },
        });
        if (variant && variant.product.images.length === 0) {
          await prisma.product.update({
            where: { id: variant.product.id },
            data: { images: listingImages.slice(0, 6) },
          });
        }
      }

      // Price history: record on first sighting and on every change.
      if (oldPrice === null || oldPrice !== raw.price || existing?.inStock !== raw.in_stock) {
        await prisma.priceHistory.create({
          data: {
            offerId: offer.id,
            price: raw.price,
            shippingCost: raw.shipping_cost ?? null,
            inStock: raw.in_stock,
          },
        });
      }

      if (oldPrice === null || oldPrice !== raw.price) {
        events.push({ offer, oldPrice, newPrice: raw.price });
      }
      upserted++;
    } catch (err) {
      console.error(`ingest error for ${raw.url}`, err);
      rejects++;
    }
  }

  const status =
    upserted === 0 ? "FAILED" : rejects > 0 || sentToReview > 0 ? "PARTIAL" : "SUCCESS";

  await prisma.scrapeRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      offersSeen: payload.offers.length,
      offersUpserted: upserted,
      rejects,
      note: sentToReview > 0 ? `${sentToReview} offers sent to match review` : null,
    },
  });

  await runPostIngestHooks(events);

  return {
    scrapeRunId: run.id,
    offersSeen: payload.offers.length,
    offersUpserted: upserted,
    rejects,
    sentToReview,
  };
}
