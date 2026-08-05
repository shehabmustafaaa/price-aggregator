import { beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/** Integration-test harness. Guards against running on anything but a database
 *  whose name contains "test", truncates every app table before each test for
 *  isolation, and exposes small seed helpers. */

const url = process.env.DATABASE_URL ?? "";
if (!/test/i.test(url)) {
  throw new Error(
    `Refusing to run integration tests: DATABASE_URL must point at a *test* database, got "${url.replace(/:[^:@/]*@/, ":***@")}". Set TEST_DATABASE_URL.`,
  );
}

/** Truncate every public table except Prisma's migration ledger, resetting
 *  identities. Name-agnostic so schema/table renames don't break it. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}

export interface SeedBase {
  categoryId: number;
  storeId: number;
  brandId: number;
}

/** Minimal fixtures every ingest test needs: the phones category, one store,
 *  one brand. */
export async function seedBase(): Promise<SeedBase> {
  const category = await prisma.category.create({
    data: { slug: "mobile-phones", nameEn: "Mobile Phones", nameAr: "موبايلات" },
  });
  const store = await prisma.store.create({
    data: { slug: "dream2000", name: "Dream2000", domain: "dream2000.com" },
  });
  const brand = await prisma.brand.create({
    data: { slug: "samsung", name: "Samsung" },
  });
  return { categoryId: category.id, storeId: store.id, brandId: brand.id };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
