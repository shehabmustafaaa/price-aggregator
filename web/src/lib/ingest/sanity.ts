import type { Offer } from "@/generated/prisma/client";

// Data-trust policy: reject absurd price jumps at ingest for manual review.
const MAX_JUMP_RATIO = 0.6; // ±60% in a single scrape

export function isPriceSane(
  existing: Pick<Offer, "price"> | null,
  newPrice: number,
): boolean {
  if (newPrice <= 0) return false;
  if (!existing) return true; // first sighting: nothing to compare against
  const old = Number(existing.price);
  if (old <= 0) return true;
  const ratio = Math.abs(newPrice - old) / old;
  return ratio <= MAX_JUMP_RATIO;
}
