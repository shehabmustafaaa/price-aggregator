/** Insert the Miami Centers store (spec 016) into an existing database, ensure
 *  the Home Appliances category exists (spec 017), and map the store to both
 *  the phones and appliances categories. Idempotent — safe to run repeatedly.
 *  Run on the server: npx tsx scripts/add-miamicenters.ts */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const store = await prisma.store.upsert({
    where: { slug: "miamicenters" },
    update: {},
    create: {
      slug: "miamicenters",
      name: "Miami Centers",
      domain: "miamicenters.com",
    },
  });

  // Home Appliances category (spec 017) — create if missing.
  const appliances = await prisma.category.upsert({
    where: { slug: "home-appliances" },
    update: {},
    create: {
      slug: "home-appliances",
      nameEn: "Home Appliances",
      nameAr: "الأجهزة المنزلية",
    },
  });

  const phones = await prisma.category.findUnique({
    where: { slug: "mobile-phones" },
  });

  for (const category of [phones, appliances]) {
    if (!category) continue;
    await prisma.categoryStore.upsert({
      where: {
        categoryId_storeId: { categoryId: category.id, storeId: store.id },
      },
      update: {},
      create: { categoryId: category.id, storeId: store.id },
    });
  }

  console.log(
    `Miami Centers ready (id=${store.id}); Home Appliances category ready (id=${appliances.id}). The daemon will schedule the store.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
