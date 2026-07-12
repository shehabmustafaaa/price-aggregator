/** One-off: canonicalize attrs.color on existing offers.
 *  Run: npx tsx scripts/backfill-colors.ts */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalColor } from "../src/lib/catalog/colors";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const offers = await prisma.offer.findMany({
    select: { id: true, attrs: true },
  });
  let updated = 0;
  for (const offer of offers) {
    const attrs = (offer.attrs ?? {}) as Record<string, unknown>;
    if (typeof attrs.color !== "string" || !attrs.color) continue;
    const key = canonicalColor(attrs.color);
    if (key !== attrs.color) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { attrs: { ...attrs, color: key } },
      });
      updated++;
    }
  }
  console.log(`updated ${updated} of ${offers.length} offers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
