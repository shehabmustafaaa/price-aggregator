/** One-off: re-resolve every offer's variant by (storage + network) so the
 *  same real config aligns across stores, then delete orphaned variants.
 *  Run: npx tsx scripts/rebuild-variants.ts */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveVariant, variantConfig } from "../src/lib/ingest/variant";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const offers = await prisma.offer.findMany({
    include: { productVariant: { select: { productId: true } } },
  });

  let repointed = 0;
  for (const offer of offers) {
    const productId = offer.productVariant.productId;
    const attrs = (offer.attrs ?? {}) as Record<string, unknown>;
    const config = variantConfig(attrs, offer.titleRaw);
    const variantId = await resolveVariant(prisma, productId, config);
    if (variantId !== offer.productVariantId) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { productVariantId: variantId },
      });
      repointed++;
    }
  }

  // Delete variants that now have no offers.
  const orphans = await prisma.productVariant.findMany({
    where: { offers: { none: {} } },
    select: { id: true },
  });
  await prisma.productVariant.deleteMany({
    where: { id: { in: orphans.map((o) => o.id) } },
  });

  console.log(
    `re-pointed ${repointed} of ${offers.length} offers; deleted ${orphans.length} orphan variants`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
