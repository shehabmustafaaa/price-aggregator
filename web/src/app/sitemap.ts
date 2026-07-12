import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    entries.push({ url: `${BASE_URL}/${locale}`, changeFrequency: "daily", priority: 1 });
    entries.push({
      url: `${BASE_URL}/${locale}/deals`,
      changeFrequency: "daily",
      priority: 0.9,
    });
    for (const c of categories) {
      entries.push({
        url: `${BASE_URL}/${locale}/c/${c.slug}`,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
    for (const p of products) {
      entries.push({
        url: `${BASE_URL}/${locale}/p/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }
  return entries;
}
