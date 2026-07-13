import { colorLabel } from "./colors";

interface SpecDef {
  key: string;
  labelEn: string;
  labelAr: string;
  unit: string | null;
}

interface ProductForFeatures {
  specs: unknown;
  variants: { attrs: unknown; offers: { attrs: unknown }[] }[];
}

export interface Feature {
  label: string;
  value: string;
}

/** Build a phone's feature list for display: known specs (labelled via the
 *  category's spec definitions) plus what we can derive from variants/offers
 *  (storage options, RAM, network, colours). Works even for auto-created
 *  products with empty specs. */
export function buildFeatures(
  product: ProductForFeatures,
  specDefs: SpecDef[],
  locale: string,
  labels: { storage: string; ram: string; network: string; colors: string; yes: string },
): Feature[] {
  const isAr = locale === "ar";
  const out: Feature[] = [];
  const specs = (product.specs ?? {}) as Record<string, unknown>;

  // 1) Declared specs (seeded/edited products).
  for (const def of specDefs) {
    const raw = specs[def.key];
    if (raw == null) continue;
    let value: string;
    if (typeof raw === "boolean") value = raw ? labels.yes : "";
    else value = `${raw}${def.unit ? ` ${def.unit}` : ""}`;
    if (value) out.push({ label: isAr ? def.labelAr : def.labelEn, value });
  }

  // 2) Derived from variants/offers (covers auto-created products).
  const storages = new Set<number>();
  const rams = new Set<number>();
  const networks = new Set<string>();
  const colors = new Set<string>();
  for (const v of product.variants) {
    const a = (v.attrs ?? {}) as Record<string, unknown>;
    if (typeof a.storage_gb === "number" && a.storage_gb >= 32) storages.add(a.storage_gb);
    if (typeof a.ram_gb === "number" && a.ram_gb <= 24) rams.add(a.ram_gb);
    if (typeof a.network === "string") networks.add(a.network);
    for (const o of v.offers) {
      const oa = (o.attrs ?? {}) as Record<string, unknown>;
      if (typeof oa.color === "string" && oa.color) colors.add(oa.color);
    }
  }

  const fmtList = (nums: number[], unit: string) =>
    nums.sort((a, b) => a - b).map((n) => (n >= 1024 ? `${n / 1024} TB` : `${n} ${unit}`)).join(" / ");

  // Derive only when the declared specs didn't already provide the value.
  if (storages.size && specs.storage_gb == null)
    out.push({ label: labels.storage, value: fmtList([...storages], "GB") });
  if (rams.size && specs.ram_gb == null)
    out.push({ label: labels.ram, value: fmtList([...rams], "GB") });
  if (networks.size)
    out.push({ label: labels.network, value: [...networks].join(" / ") });
  if (colors.size)
    out.push({
      label: labels.colors,
      value: [...colors].map((c) => colorLabel(c, locale)).join("، "),
    });

  return out;
}
