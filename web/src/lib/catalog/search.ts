import { prisma } from "@/lib/db";
import { freshOfferWhere } from "./offers";
import { normalizeText, searchTokens } from "@/lib/text";

/** Single entry point for product search (guardrail #12).
 *  Arabic-aware token matching in-app: every query token must appear in the
 *  product's normalized text (name EN/AR + brand + model). This tolerates
 *  spelling variants (alef/hamza), word order, and partial words that plain
 *  substring search misses. Swapping to Meilisearch changes only this module. */
export async function searchProducts(query: string, locale: string) {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  const [products, titleRows] = await Promise.all([
    prisma.product.findMany({
      include: {
        brand: true,
        variants: {
          include: {
            offers: {
              where: freshOfferWhere(),
              include: { store: true },
              orderBy: { price: "asc" as const },
            },
          },
        },
      },
    }),
    // ALL offer titles (fresh or stale) — spelling knowledge for search
    // findability doesn't expire when a price goes stale.
    prisma.offer.findMany({
      select: { titleRaw: true, productVariant: { select: { productId: true } } },
    }),
  ]);

  const titlesByProduct = new Map<number, string[]>();
  for (const row of titleRows) {
    const pid = row.productVariant.productId;
    const list = titlesByProduct.get(pid) ?? [];
    list.push(row.titleRaw);
    titlesByProduct.set(pid, list);
  }

  const scored = products
    .map((p) => {
      // Include every store's listing title so any spelling any store used
      // is searchable (e.g. B.TECH "جالكسي" vs Dream2000 "جالاكسي").
      const offerTitles = (titlesByProduct.get(p.id) ?? []).join(" ");
      const hay = normalizeText(
        `${p.nameEn} ${p.nameAr} ${p.brand?.name ?? ""} ${p.modelNumber ?? ""} ${offerTitles}`,
      );
      const hits = tokens.filter((t) => hay.includes(t)).length;
      const hasOffers = p.variants.some((v) => v.offers.length > 0);
      return { p, all: hits === tokens.length, hits, hasOffers };
    })
    .filter((x) => x.all)
    // In-stock products first, then most token hits.
    .sort((a, b) => Number(b.hasOffers) - Number(a.hasOffers) || b.hits - a.hits)
    .slice(0, 60);

  if (scored.length === 0) {
    // Micro-feature: no-results capture drives what to add next.
    await prisma.missedSearch.create({ data: { query: query.trim(), locale } });
  }

  return scored.map((x) => x.p);
}
