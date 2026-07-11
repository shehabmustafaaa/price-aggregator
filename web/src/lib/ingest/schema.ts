import { z } from "zod";

export const rawOfferSchema = z.object({
  url: z.string().url(),
  title: z.string().min(3),
  price: z.number().positive(),
  shipping_cost: z.number().nonnegative().nullable().optional(),
  currency: z.string().default("EGP"),
  in_stock: z.boolean().default(true),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]).default("NEW"),
  warranty_type: z
    .enum(["OFFICIAL_LOCAL", "IMPORTED", "UNKNOWN"])
    .default("UNKNOWN"),
  region_version: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model_number: z.string().nullable().optional(),
  // Variant attributes the scraper could extract, e.g. {"storage_gb":256,"color":"black"}
  attrs: z.record(z.string(), z.unknown()).default({}),
  image_url: z.string().url().nullable().optional(),
});

export const ingestPayloadSchema = z.object({
  store_slug: z.string(),
  category_slug: z.string(),
  run_started_at: z.string().datetime({ offset: true }).optional(),
  offers: z.array(rawOfferSchema),
  // Scraper-side stats for the health row
  parse_errors: z.number().int().nonnegative().default(0),
});

export type RawOffer = z.infer<typeof rawOfferSchema>;
export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
