import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resolveVariant } from "./variant";
import { seedBase } from "@/test/integration-setup";

/** DB-integration tests for resolveVariant (find-or-create a variant keyed on
 *  STORAGE only; RAM/network are informational and enriched on later sightings). */
describe("resolveVariant (integration)", () => {
  let productId: number;

  beforeEach(async () => {
    const { categoryId } = await seedBase();
    const product = await prisma.product.create({
      data: { categoryId, slug: "galaxy-a17", nameEn: "Galaxy A17", nameAr: "جالكسي A17" },
    });
    productId = product.id;
  });

  it("creates a variant for a new storage config", async () => {
    const id = await resolveVariant(prisma, productId, {
      storage_gb: 128,
      ram_gb: 6,
      network: "4G",
    });
    const v = await prisma.productVariant.findUnique({ where: { id } });
    expect(v?.attrs).toMatchObject({ storage_gb: 128, ram_gb: 6, network: "4G" });
  });

  it("returns the SAME variant for the same storage (RAM/network not part of the key)", async () => {
    const a = await resolveVariant(prisma, productId, {
      storage_gb: 256,
      ram_gb: 8,
      network: "4G",
    });
    const b = await resolveVariant(prisma, productId, {
      storage_gb: 256,
      ram_gb: 12, // different RAM
      network: "5G", // different network
    });
    expect(b).toBe(a);
    expect(await prisma.productVariant.count({ where: { productId } })).toBe(1);
  });

  it("creates DIFFERENT variants for different storage", async () => {
    const a = await resolveVariant(prisma, productId, { storage_gb: 128, ram_gb: 6, network: null });
    const b = await resolveVariant(prisma, productId, { storage_gb: 256, ram_gb: 6, network: null });
    expect(b).not.toBe(a);
    expect(await prisma.productVariant.count({ where: { productId } })).toBe(2);
  });

  it("enriches RAM/network on a later sighting but does not overwrite existing values", async () => {
    // First sighting: storage only.
    const id = await resolveVariant(prisma, productId, {
      storage_gb: 128,
      ram_gb: null,
      network: null,
    });
    // Later sighting from a richer store fills RAM + network.
    await resolveVariant(prisma, productId, { storage_gb: 128, ram_gb: 6, network: "5G" });
    let v = await prisma.productVariant.findUnique({ where: { id } });
    expect(v?.attrs).toMatchObject({ storage_gb: 128, ram_gb: 6, network: "5G" });

    // A conflicting later value must NOT overwrite what we already know.
    await resolveVariant(prisma, productId, { storage_gb: 128, ram_gb: 99, network: "4G" });
    v = await prisma.productVariant.findUnique({ where: { id } });
    expect(v?.attrs).toMatchObject({ ram_gb: 6, network: "5G" });
  });
});
