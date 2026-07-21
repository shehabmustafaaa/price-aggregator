import { prisma } from "@/lib/db";
import { IngestOutcome } from "@/generated/prisma/client";
import type { IngestPayload } from "./schema";
import { matchOffer } from "./match";
import { isPriceSane } from "./sanity";
import { runPostIngestHooks, type PriceChangeEvent } from "./hooks";
import { canonicalColor } from "@/lib/catalog/colors";
import { autoCreateProduct } from "./autocreate";
import { resolveVariant, variantConfig } from "./variant";
import { isAccessory } from "./classify";
import { AUTO_APPROVE_KEY, getBoolSetting } from "@/lib/settings";
import "@/lib/alerts/hook"; // registers the price-alert post-ingest hook

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
  let autoCreated = 0;
  let skippedAccessories = 0;
  const events: PriceChangeEvent[] = [];
  // Per-URL audit rows for this run (see IngestEvent).
  const audit: {
    url: string;
    title: string;
    price: number | null;
    outcome: IngestOutcome;
    reason: string | null;
    productId: number | null;
  }[] = [];
  const autoApprove = await getBoolSetting(AUTO_APPROVE_KEY, true);
  const isPhones = category.slug === "mobile-phones";

  for (const raw of payload.offers) {
    try {
      // Keep accessories (earbuds, chargers, cases…) out of the phones
      // catalog — stores mix them into their mobiles category pages.
      if (isPhones && isAccessory(raw.title)) {
        skippedAccessories++;
        audit.push({
          url: raw.url,
          title: raw.title,
          price: raw.price,
          outcome: IngestOutcome.SKIPPED_ACCESSORY,
          reason: "title leads with an accessory word (not a phone)",
          productId: null,
        });
        continue;
      }

      // Colors are canonicalized at ingest — the ONLY place — so every
      // store's spelling ("Black", "اسود", "Ink Black") maps to one key.
      if (typeof raw.attrs?.color === "string") {
        raw.attrs.color = canonicalColor(raw.attrs.color);
      }
      const existing = await prisma.offer.findUnique({
        where: { storeId_url: { storeId: store.id, url: raw.url } },
      });

      if (!isPriceSane(existing, raw.price)) {
        rejects++;
        audit.push({
          url: raw.url,
          title: raw.title,
          price: raw.price,
          outcome: IngestOutcome.REJECTED_PRICE,
          reason: existing
            ? `price ${raw.price} is an implausible jump from last-seen ${Number(existing.price)}`
            : "price failed sanity check",
          productId: null,
        });
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

      // Resolve the product this offer belongs to. Existing offers keep
      // their product; new ones match or auto-create.
      let productId: number | undefined;
      let outcome: IngestOutcome = IngestOutcome.GRABBED;
      if (existing) {
        const v = await prisma.productVariant.findUnique({
          where: { id: existing.productVariantId },
          select: { productId: true },
        });
        productId = v?.productId;
      }
      if (!productId) {
        const match = await matchOffer(raw, category.id);
        if (match.productId) {
          productId = match.productId;
        } else if (autoApprove) {
          // Auto-approve default: create the product on the spot. Offers
          // later in the same run for the same base name will match it.
          productId = await autoCreateProduct(raw, category.id);
          autoCreated++;
          outcome = IngestOutcome.AUTO_CREATED;
        } else {
          sentToReview++;
          audit.push({
            url: raw.url,
            title: raw.title,
            price: raw.price,
            outcome: IngestOutcome.REVIEW_QUEUED,
            reason: `no confident product match (best score ${match.confidence.toFixed(2)})`,
            productId: null,
          });
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
      }

      // Resolve the exact variant (storage + network) within the product,
      // creating it if this config hasn't been seen — this is what keeps
      // cross-store comparison like-for-like.
      const productVariantId = await resolveVariant(
        prisma,
        productId,
        variantConfig(raw.attrs, raw.title),
      );

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
          productVariantId, // re-point if the resolved variant changed
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
      audit.push({
        url: raw.url,
        title: raw.title,
        price: raw.price,
        outcome,
        reason:
          outcome === IngestOutcome.AUTO_CREATED
            ? "new product created"
            : oldPrice === null
              ? "first time seen"
              : oldPrice !== raw.price
                ? `price ${oldPrice} → ${raw.price}`
                : "unchanged",
        productId,
      });
      upserted++;
    } catch (err) {
      console.error(`ingest error for ${raw.url}`, err);
      rejects++;
      audit.push({
        url: raw.url,
        title: raw.title,
        price: raw.price ?? null,
        outcome: IngestOutcome.ERROR,
        reason: (err instanceof Error ? err.message : String(err)).slice(0, 300),
        productId: null,
      });
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
      note:
        [
          autoCreated > 0 ? `${autoCreated} products auto-created` : null,
          skippedAccessories > 0
            ? `${skippedAccessories} accessories skipped`
            : null,
          sentToReview > 0 ? `${sentToReview} offers sent to match review` : null,
        ]
          .filter(Boolean)
          .join("; ") || null,
    },
  });

  // Write the per-URL audit for this run, then prune old events so the table
  // stays bounded (keep the last 2 days).
  if (audit.length > 0) {
    await prisma.ingestEvent.createMany({
      data: audit.map((e) => ({
        runId: run.id,
        storeId: store.id,
        url: e.url,
        title: e.title.slice(0, 300),
        price: e.price,
        outcome: e.outcome,
        reason: e.reason,
        productId: e.productId,
      })),
    });
  }
  await prisma.ingestEvent.deleteMany({
    where: {
      run: { startedAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } },
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
