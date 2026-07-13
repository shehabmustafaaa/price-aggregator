import type { PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface VariantConfig {
  storage_gb: number | null;
  ram_gb: number | null;
  network: string | null; // "5G" | "4G" | null
}

/** Network is a major price driver and appears in titles across every store
 *  ("A17 5G", "شبكة 4G LTE"). Detected uniformly here rather than per-adapter. */
export function detectNetwork(title: string): string | null {
  const t = title.toLowerCase();
  if (/\b5\s*g\b/.test(t) || t.includes("5g")) return "5G";
  if (/\b4\s*g\b/.test(t) || t.includes("4g") || t.includes("lte")) return "4G";
  return null;
}

export function variantConfig(
  attrs: Record<string, unknown>,
  title: string,
): VariantConfig {
  return {
    storage_gb: typeof attrs.storage_gb === "number" ? attrs.storage_gb : null,
    ram_gb: typeof attrs.ram_gb === "number" ? attrs.ram_gb : null,
    network: detectNetwork(title),
  };
}

/** Variant identity = STORAGE only. Every store reliably reports storage,
 *  so keying on it aligns the same config across stores. RAM and network are
 *  recorded as informational attrs (filled from whichever store provides
 *  them) but excluded from the key: not all stores report them, so keying
 *  on them would fragment the same real config. (Finer 4G/5G separation is
 *  a future refinement — see deals.ts plausibility cap.) */
export async function resolveVariant(
  db: Db,
  productId: number,
  config: VariantConfig,
): Promise<number> {
  const variants = await db.productVariant.findMany({ where: { productId } });
  for (const v of variants) {
    const a = (v.attrs ?? {}) as Record<string, unknown>;
    const storage = typeof a.storage_gb === "number" ? a.storage_gb : null;
    if (storage === config.storage_gb) {
      // Enrich the variant with RAM/network once known.
      const patch: Record<string, unknown> = {};
      if (config.ram_gb != null && a.ram_gb == null) patch.ram_gb = config.ram_gb;
      if (config.network != null && a.network == null) patch.network = config.network;
      if (Object.keys(patch).length) {
        await db.productVariant.update({
          where: { id: v.id },
          data: { attrs: JSON.parse(JSON.stringify({ ...a, ...patch })) },
        });
      }
      return v.id;
    }
  }
  const created = await db.productVariant.create({
    data: {
      productId,
      attrs: {
        storage_gb: config.storage_gb,
        ram_gb: config.ram_gb,
        network: config.network,
      },
    },
  });
  return created.id;
}
