import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { matchOffer } from "./match";
import type { RawOffer } from "./schema";
import { seedBase, type SeedBase } from "@/test/integration-setup";

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

/** DB-integration tests for matchOffer (model-number exact → guarded bilingual
 *  token overlap → null). */
describe("matchOffer (integration)", () => {
  let base: SeedBase;

  beforeEach(async () => {
    base = await seedBase();
  });

  async function createProduct(
    nameEn: string,
    nameAr: string,
    extra: { modelNumber?: string; brandId?: number | null } = {},
  ) {
    return prisma.product.create({
      data: {
        categoryId: base.categoryId,
        brandId: extra.brandId === undefined ? base.brandId : extra.brandId,
        slug: nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 6),
        nameEn,
        nameAr,
        modelNumber: extra.modelNumber ?? null,
      },
    });
  }

  it("matches on exact model number with full confidence", async () => {
    const p = await createProduct("Galaxy A17", "جالكسي A17", { modelNumber: "SM-A175" });
    const res = await matchOffer(
      rawOffer({ title: "Some unrelated title", model_number: "sm-a175", brand: "Samsung" }),
      base.categoryId,
    );
    expect(res.productId).toBe(p.id);
    expect(res.confidence).toBe(1);
  });

  it("matches on bilingual token overlap when digit tokens agree", async () => {
    const p = await createProduct("Galaxy A17", "جالكسي A17");
    const res = await matchOffer(
      rawOffer({ title: "سامسونج جالكسي A17 سعة 128 جيجا - اسود", brand: "Samsung" }),
      base.categoryId,
    );
    expect(res.productId).toBe(p.id);
    expect(res.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("does NOT match a different model number (digit-token guard)", async () => {
    await createProduct("Galaxy A17", "جالكسي A17");
    const res = await matchOffer(
      rawOffer({ title: "سامسونج جالكسي A56 سعة 128 جيجا - اسود", brand: "Samsung" }),
      base.categoryId,
    );
    expect(res.productId).toBeNull();
  });

  it("does NOT match across brands", async () => {
    await createProduct("Galaxy A17", "جالكسي A17"); // Samsung
    const res = await matchOffer(
      rawOffer({ title: "Apple Galaxy A17 lookalike", brand: "Apple" }),
      base.categoryId,
    );
    expect(res.productId).toBeNull();
  });

  it("returns null when the catalog is empty", async () => {
    const res = await matchOffer(
      rawOffer({ title: "سامسونج جالكسي A17", brand: "Samsung" }),
      base.categoryId,
    );
    expect(res.productId).toBeNull();
    expect(res.confidence).toBe(0);
  });
});
