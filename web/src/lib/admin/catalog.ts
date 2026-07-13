import { prisma } from "@/lib/db";

export async function listProductsForAdmin(query: string, take = 50) {
  return prisma.product.findMany({
    where: query
      ? {
          OR: [
            { nameEn: { contains: query, mode: "insensitive" } },
            { nameAr: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      brand: true,
      variants: { include: { _count: { select: { offers: true } } } },
    },
    orderBy: { id: "desc" },
    take,
  });
}

export async function updateProduct(
  id: number,
  data: { nameEn: string; nameAr: string; slug: string },
) {
  await prisma.product.update({
    where: { id },
    data: {
      nameEn: data.nameEn.trim(),
      nameAr: data.nameAr.trim(),
      slug: data.slug.trim(),
    },
  });
}

export interface FullProductInput {
  nameEn: string;
  nameAr: string;
  slug: string;
  brandName?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  specsJson?: string; // raw JSON text from the admin textarea
  imagesText?: string; // one URL per line
}

/** Full product edit used by /admin/catalog/[id]. */
export async function updateProductFull(id: number, input: FullProductInput) {
  let brandId: number | null | undefined;
  const brandName = input.brandName?.trim();
  if (brandName) {
    const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { slug, name: brandName },
    });
    brandId = brand.id;
  } else {
    brandId = null;
  }

  let specs: unknown = undefined;
  if (input.specsJson != null && input.specsJson.trim()) {
    try {
      specs = JSON.parse(input.specsJson);
    } catch {
      throw new Error("specs is not valid JSON");
    }
  }

  const images =
    input.imagesText != null
      ? input.imagesText
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => /^https?:\/\//.test(s))
      : undefined;

  await prisma.product.update({
    where: { id },
    data: {
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      slug: input.slug.trim(),
      brandId,
      descriptionEn: input.descriptionEn?.trim() || null,
      descriptionAr: input.descriptionAr?.trim() || null,
      ...(specs !== undefined ? { specs: JSON.parse(JSON.stringify(specs)) } : {}),
      ...(images !== undefined ? { images } : {}),
    },
  });
}

/** Full cascade delete — for accessories that don't belong in the catalog. */
export async function deleteProduct(id: number) {
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
    await tx.priceAlert.deleteMany({ where: { productId: id } });
    await tx.favorite.deleteMany({ where: { productId: id } });
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
}

/** Merge duplicate products: source's variants (with their offers and
 *  history) move to the target; alerts/favorites re-point; source dies.
 *  Target keeps its names/slug; gains source's images if it has none. */
export async function mergeProducts(sourceId: number, targetId: number) {
  if (sourceId === targetId) throw new Error("cannot merge into itself");
  await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.product.findUnique({ where: { id: sourceId } }),
      tx.product.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) throw new Error("product not found");

    await tx.productVariant.updateMany({
      where: { productId: sourceId },
      data: { productId: targetId },
    });

    // Re-point alerts/favorites; drop ones that would duplicate.
    const sourceAlerts = await tx.priceAlert.findMany({
      where: { productId: sourceId },
    });
    for (const alert of sourceAlerts) {
      const dup = await tx.priceAlert.findFirst({
        where: { userId: alert.userId, productId: targetId, active: true },
      });
      if (dup) {
        await tx.priceAlert.delete({ where: { id: alert.id } });
      } else {
        await tx.priceAlert.update({
          where: { id: alert.id },
          data: { productId: targetId },
        });
      }
    }
    const sourceFavorites = await tx.favorite.findMany({
      where: { productId: sourceId },
    });
    for (const fav of sourceFavorites) {
      const dup = await tx.favorite.findUnique({
        where: {
          userId_productId: { userId: fav.userId, productId: targetId },
        },
      });
      await tx.favorite.delete({
        where: {
          userId_productId: { userId: fav.userId, productId: sourceId },
        },
      });
      if (!dup) {
        await tx.favorite.create({
          data: { userId: fav.userId, productId: targetId },
        });
      }
    }

    if (target.images.length === 0 && source.images.length > 0) {
      await tx.product.update({
        where: { id: targetId },
        data: { images: source.images },
      });
    }

    await tx.product.delete({ where: { id: sourceId } });
  });
}
