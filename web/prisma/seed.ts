import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // --- Category: mobile phones (taxonomy is extensible; this is just the first) ---
  const phones = await prisma.category.upsert({
    where: { slug: "mobile-phones" },
    update: {},
    create: {
      slug: "mobile-phones",
      nameEn: "Mobile Phones",
      nameAr: "الموبايلات",
    },
  });

  // --- Spec facets for phones ---
  const specs: Array<
    [string, string, string, string | null, string, number]
  > = [
    ["ram_gb", "RAM", "الرامات", "GB", "multi", 1],
    ["storage_gb", "Storage", "المساحة", "GB", "multi", 2],
    ["screen_inch", "Screen size", "حجم الشاشة", "inch", "range", 3],
    ["battery_mah", "Battery", "البطارية", "mAh", "range", 4],
    ["has_5g", "5G", "يدعم 5G", null, "boolean", 5],
  ];
  for (const [key, labelEn, labelAr, unit, filterType, sortOrder] of specs) {
    await prisma.specDefinition.upsert({
      where: { categoryId_key: { categoryId: phones.id, key } },
      update: {},
      create: { categoryId: phones.id, key, labelEn, labelAr, unit, filterType, sortOrder },
    });
  }

  // --- Store #1: Dream2000 ---
  const dream = await prisma.store.upsert({
    where: { slug: "dream2000" },
    update: {},
    create: {
      slug: "dream2000",
      name: "Dream2000",
      domain: "dream2000.com",
    },
  });

  await prisma.categoryStore.upsert({
    where: { categoryId_storeId: { categoryId: phones.id, storeId: dream.id } },
    update: {},
    create: { categoryId: phones.id, storeId: dream.id },
  });

  // --- Brands ---
  const brandNames = ["Samsung", "Apple", "Xiaomi", "Oppo", "Realme", "Honor", "Infinix", "Vivo", "Nokia", "Tecno"];
  const brands: Record<string, number> = {};
  for (const name of brandNames) {
    const b = await prisma.brand.upsert({
      where: { slug: name.toLowerCase() },
      update: {},
      create: { slug: name.toLowerCase(), name },
    });
    brands[name] = b.id;
  }

  // --- Canonical products the matcher can hit (small starter catalog) ---
  const products: Array<{
    brand: string;
    nameEn: string;
    nameAr: string;
    slug: string;
    modelNumber?: string;
    specs: Record<string, string | number | boolean>;
    variants: Array<Record<string, string | number | boolean>>;
  }> = [
    {
      brand: "Samsung",
      nameEn: "Samsung Galaxy S25 Ultra",
      nameAr: "سامسونج جالاكسي S25 الترا",
      slug: "samsung-galaxy-s25-ultra",
      modelNumber: "SM-S938",
      specs: { ram_gb: 12, screen_inch: 6.9, battery_mah: 5000, has_5g: true },
      variants: [{ storage_gb: 256 }, { storage_gb: 512 }, { storage_gb: 1024 }],
    },
    {
      brand: "Samsung",
      nameEn: "Samsung Galaxy A56",
      nameAr: "سامسونج جالاكسي A56",
      slug: "samsung-galaxy-a56",
      modelNumber: "SM-A566",
      specs: { ram_gb: 8, screen_inch: 6.7, battery_mah: 5000, has_5g: true },
      variants: [{ storage_gb: 128 }, { storage_gb: 256 }],
    },
    {
      brand: "Apple",
      nameEn: "Apple iPhone 16",
      nameAr: "ابل ايفون 16",
      slug: "apple-iphone-16",
      modelNumber: "A3287",
      specs: { ram_gb: 8, screen_inch: 6.1, battery_mah: 3561, has_5g: true },
      variants: [{ storage_gb: 128 }, { storage_gb: 256 }, { storage_gb: 512 }],
    },
    {
      brand: "Apple",
      nameEn: "Apple iPhone 16 Pro Max",
      nameAr: "ابل ايفون 16 برو ماكس",
      slug: "apple-iphone-16-pro-max",
      modelNumber: "A3296",
      specs: { ram_gb: 8, screen_inch: 6.9, battery_mah: 4685, has_5g: true },
      variants: [{ storage_gb: 256 }, { storage_gb: 512 }, { storage_gb: 1024 }],
    },
    {
      brand: "Xiaomi",
      nameEn: "Xiaomi Redmi Note 14 Pro",
      nameAr: "شاومي ريدمي نوت 14 برو",
      slug: "xiaomi-redmi-note-14-pro",
      specs: { ram_gb: 8, screen_inch: 6.67, battery_mah: 5500, has_5g: true },
      variants: [{ storage_gb: 128 }, { storage_gb: 256 }],
    },
    {
      brand: "Oppo",
      nameEn: "Oppo Reno 13",
      nameAr: "اوبو رينو 13",
      slug: "oppo-reno-13",
      specs: { ram_gb: 12, screen_inch: 6.59, battery_mah: 5600, has_5g: true },
      variants: [{ storage_gb: 256 }, { storage_gb: 512 }],
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        categoryId: phones.id,
        brandId: brands[p.brand],
        slug: p.slug,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        modelNumber: p.modelNumber ?? null,
        specs: p.specs,
        variants: { create: p.variants.map((attrs) => ({ attrs })) },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
