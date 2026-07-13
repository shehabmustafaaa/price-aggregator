/** One-off: delete accessory products auto-created into the phones category
 *  (earbuds, chargers, card readers…). Skips any product a user has an alert
 *  or favorite on (safety). Pass --dry to preview.
 *  Run: npx tsx scripts/prune-accessories.ts [--dry] */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isAccessory } from "../src/lib/ingest/classify";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const dry = process.argv.includes("--dry");

async function deleteProductCascade(id: number) {
  await prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const variantIds = variants.map((v) => v.id);
    const offers = await tx.offer.findMany({
      where: { productVariantId: { in: variantIds } },
      select: { id: true },
    });
    const offerIds = offers.map((o) => o.id);
    await tx.priceHistory.deleteMany({ where: { offerId: { in: offerIds } } });
    await tx.outboundClick.deleteMany({ where: { offerId: { in: offerIds } } });
    await tx.priceReport.deleteMany({ where: { offerId: { in: offerIds } } });
    await tx.offer.deleteMany({ where: { id: { in: offerIds } } });
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
}

async function main() {
  const products = await prisma.product.findMany({
    where: { category: { slug: "mobile-phones" } },
    include: {
      _count: { select: { priceAlerts: true, favorites: true } },
    },
  });

  const targets = products.filter(
    (p) =>
      (isAccessory(p.nameEn) || isAccessory(p.nameAr)) &&
      p._count.priceAlerts === 0 &&
      p._count.favorites === 0,
  );

  console.log(`${targets.length} accessory products to remove${dry ? " (dry run)" : ""}:`);
  for (const p of targets) console.log(`  #${p.id} ${p.nameEn.slice(0, 60)}`);

  if (!dry) {
    for (const p of targets) await deleteProductCascade(p.id);
    console.log(`deleted ${targets.length} products`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
