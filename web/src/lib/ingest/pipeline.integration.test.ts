import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { ingest } from "./pipeline";
import type { IngestPayload, RawOffer } from "./schema";
import { setBoolSetting, AUTO_APPROVE_KEY } from "@/lib/settings";
import { seedBase } from "@/test/integration-setup";

function rawOffer(partial: Partial<RawOffer> & Pick<RawOffer, "title">): RawOffer {
  return {
    url: `https://dream2000.com/p/${Math.random().toString(36).slice(2)}`,
    price: 10000,
    currency: "EGP",
    in_stock: true,
    condition: "NEW",
    warranty_type: "OFFICIAL_LOCAL",
    attrs: {},
    image_urls: [],
    ...partial,
  };
}

function payload(offers: RawOffer[]): IngestPayload {
  return {
    store_slug: "dream2000",
    category_slug: "mobile-phones",
    offers,
    parse_errors: 0,
  };
}

/** DB-integration tests for the full ingest pipeline. */
describe("ingest pipeline (integration)", () => {
  beforeEach(async () => {
    await seedBase();
  });

  it("auto-creates a product, variant, offer, price history and audit row", async () => {
    const offer = rawOffer({
      title: "سامسونج جالكسي A17 سعة 128 جيجا - اسود",
      brand: "Samsung",
      price: 12000,
      attrs: { storage_gb: 128, color: "اسود" },
      url: "https://dream2000.com/p/galaxy-a17",
    });
    const res = await ingest(payload([offer]));

    expect(res.offersUpserted).toBe(1);
    expect(res.rejects).toBe(0);
    expect(await prisma.product.count()).toBe(1);
    expect(await prisma.productVariant.count()).toBe(1);
    expect(await prisma.offer.count()).toBe(1);
    expect(await prisma.priceHistory.count()).toBe(1);

    const run = await prisma.scrapeRun.findUnique({ where: { id: res.scrapeRunId } });
    expect(run?.status).toBe("SUCCESS");

    const event = await prisma.ingestEvent.findFirst({ where: { runId: res.scrapeRunId } });
    expect(event?.outcome).toBe("AUTO_CREATED");
  });

  it("skips accessories and records them without creating a product", async () => {
    const res = await ingest(
      payload([
        rawOffer({ title: "جراب سامسونج جالكسي A17 سيليكون - اسود", price: 300 }),
      ]),
    );
    expect(res.offersUpserted).toBe(0);
    expect(await prisma.product.count()).toBe(0);
    expect(await prisma.offer.count()).toBe(0);
    const event = await prisma.ingestEvent.findFirst({ where: { runId: res.scrapeRunId } });
    expect(event?.outcome).toBe("SKIPPED_ACCESSORY");
  });

  it("rejects an implausible price jump and queues it for review", async () => {
    const url = "https://dream2000.com/p/galaxy-a17";
    // First sighting establishes the offer at 12,000.
    await ingest(
      payload([
        rawOffer({
          title: "سامسونج جالكسي A17 سعة 128 جيجا - اسود",
          brand: "Samsung",
          price: 12000,
          attrs: { storage_gb: 128 },
          url,
        }),
      ]),
    );
    // Second run: 120,000 is a >60% jump → rejected.
    const res = await ingest(
      payload([
        rawOffer({
          title: "سامسونج جالكسي A17 سعة 128 جيجا - اسود",
          brand: "Samsung",
          price: 120000,
          attrs: { storage_gb: 128 },
          url,
        }),
      ]),
    );
    expect(res.rejects).toBe(1);
    expect(res.offersUpserted).toBe(0);
    const offer = await prisma.offer.findFirst({ where: { url } });
    expect(Number(offer?.price)).toBe(12000); // unchanged
    expect(await prisma.matchReview.count({ where: { status: "pending" } })).toBe(1);
    const event = await prisma.ingestEvent.findFirst({
      where: { runId: res.scrapeRunId },
    });
    expect(event?.outcome).toBe("REJECTED_PRICE");
  });

  it("appends price history only when the price changes", async () => {
    const url = "https://dream2000.com/p/galaxy-a17";
    const mk = (price: number) =>
      payload([
        rawOffer({
          title: "سامسونج جالكسي A17 سعة 128 جيجا - اسود",
          brand: "Samsung",
          price,
          attrs: { storage_gb: 128 },
          url,
        }),
      ]);

    await ingest(mk(12000)); // first sighting → 1 history row
    await ingest(mk(12000)); // unchanged → no new row
    await ingest(mk(11000)); // sane drop → +1 row

    const offer = await prisma.offer.findFirst({ where: { url } });
    expect(await prisma.priceHistory.count({ where: { offerId: offer!.id } })).toBe(2);
    expect(Number(offer?.price)).toBe(11000);
  });

  it("queues unmatched offers for review when auto-approve is off", async () => {
    await setBoolSetting(AUTO_APPROVE_KEY, false);
    const res = await ingest(
      payload([
        rawOffer({
          title: "سامسونج جالكسي A17 سعة 128 جيجا - اسود",
          brand: "Samsung",
          price: 12000,
          attrs: { storage_gb: 128 },
          url: "https://dream2000.com/p/galaxy-a17",
        }),
      ]),
    );
    expect(res.sentToReview).toBe(1);
    expect(await prisma.product.count()).toBe(0);
    expect(await prisma.matchReview.count({ where: { status: "pending" } })).toBe(1);
    const event = await prisma.ingestEvent.findFirst({ where: { runId: res.scrapeRunId } });
    expect(event?.outcome).toBe("REVIEW_QUEUED");
  });
});
