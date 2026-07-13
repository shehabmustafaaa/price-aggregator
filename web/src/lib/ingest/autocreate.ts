import { prisma } from "@/lib/db";
import type { RawOffer } from "./schema";

/** Auto-create a canonical product from an unmatched offer.
 *
 *  Base name = the first " - " segment of the listing title (both Dream2000
 *  Arabic and 2B English titles put the product name there). Slug prefers
 *  the slugified base name; Arabic-only names fall back to the store URL
 *  handle (e.g. dream2000.com/products/galaxy-a17 → galaxy-a17).
 *
 *  Known tradeoff: two stores naming the same phone in different languages
 *  can produce duplicate products — a merge tool handles that later. */
export function deriveBaseName(title: string): string {
  // Drop the trailing "- color/variant" clause (Dream2000/2B), then the
  // spec clauses that follow an Arabic/Latin comma ("، سعة… ، رام…" on
  // B.TECH), leaving just the model name.
  let name = title.split(" - ")[0];
  name = name.split(/[،,]/)[0];
  name = name.replace(/\s+/g, " ").trim();
  return name || title.trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).pop() ?? "";
    return slugify(last.replace(/\.html?$/i, ""));
  } catch {
    return "";
  }
}

export async function autoCreateProduct(
  raw: RawOffer,
  categoryId: number,
): Promise<number /* productId */> {
  const baseName = deriveBaseName(raw.title);
  let slug = slugify(baseName) || slugFromUrl(raw.url) || `product-${Date.now()}`;

  // Ensure slug uniqueness.
  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now() % 100000}`;

  let brandId: number | null = null;
  if (raw.brand) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(raw.brand) },
      update: {},
      create: { slug: slugify(raw.brand), name: raw.brand },
    });
    brandId = brand.id;
  }

  // Variants are created on demand by resolveVariant, keyed on storage+network.
  const product = await prisma.product.create({
    data: {
      categoryId,
      brandId,
      slug,
      // Auto-created: both names start as the base title (one language may
      // be wrong until edited) — better than an empty catalog.
      nameEn: baseName,
      nameAr: baseName,
      images: raw.image_urls?.length
        ? raw.image_urls.slice(0, 6)
        : raw.image_url
          ? [raw.image_url]
          : [],
    },
  });

  return product.id;
}
