/** Insert the Miami Centers store (spec 016) into an existing database and map
 *  it to the phones category. Idempotent — safe to run repeatedly.
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

  const phones = await prisma.category.findUnique({
    where: { slug: "mobile-phones" },
  });
  if (phones) {
    await prisma.categoryStore.upsert({
      where: {
        categoryId_storeId: { categoryId: phones.id, storeId: store.id },
      },
      update: {},
      create: { categoryId: phones.id, storeId: store.id },
    });
  }

  console.log(
    `Miami Centers store ready (id=${store.id}). It will be scheduled by the daemon.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
