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

/** A second category proves the pipeline is category-generic (spec 017):
 *  appliances carry no storage/RAM, so each model resolves to a single variant,
 *  and the phone-only accessory filter must not touch them. */
describe("ingest pipeline — home appliances (integration)", () => {
  async function seedAppliances() {
    await seedBase(); // gives us the store (dream2000) + phones category
    return prisma.category.create({
      data: {
        slug: "home-appliances",
        nameEn: "Home Appliances",
        nameAr: "الأجهزة المنزلية",
      },
    });
  }

  function appliancePayload(offers: RawOffer[]): IngestPayload {
    return {
      store_slug: "dream2000",
      category_slug: "home-appliances",
      offers,
      parse_errors: 0,
    };
  }

  it("creates one product with exactly one variant per appliance", async () => {
    const category = await seedAppliances();
    const res = await ingest(
      appliancePayload([
        rawOffer({
          title: "Braun Hand Blender MultiQuick 5 1000W",
          brand: "Braun",
          price: 4220,
          url: "https://miamicenters.com/product/braun-blender/",
        }),
        rawOffer({
          title: "Kenwood Airfryer 5L 1500W LCD",
          brand: "Kenwood",
          price: 6330,
          url: "https://miamicenters.com/product/kenwood-airfryer/",
        }),
      ]),
    );

    expect(res.offersUpserted).toBe(2);
    const products = await prisma.product.findMany({
      where: { categoryId: category.id },
      include: { variants: true },
    });
    expect(products).toHaveLength(2);
    // No storage attr → each appliance model is a single comparable variant.
    expect(products.every((p) => p.variants.length === 1)).toBe(true);
  });

  it("does NOT apply the phone accessory filter outside the phones category", async () => {
    // "شاحن" (charger) leads the title — in the phones category this would be
    // skipped as an accessory; under appliances it must be ingested normally.
    const category = await seedAppliances();
    const res = await ingest(
      appliancePayload([
        rawOffer({
          title: "شاحن سريع 65 وات",
          price: 1500,
          url: "https://miamicenters.com/product/fast-charger/",
        }),
      ]),
    );
    expect(res.offersUpserted).toBe(1);
    expect(await prisma.product.count({ where: { categoryId: category.id } })).toBe(1);
  });
});
