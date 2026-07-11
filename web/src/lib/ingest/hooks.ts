import type { Offer } from "@/generated/prisma/client";

export interface PriceChangeEvent {
  offer: Offer;
  oldPrice: number | null; // null when the offer is new
  newPrice: number;
}

type PostIngestHook = (events: PriceChangeEvent[]) => Promise<void>;

/** Post-ingest hooks (guardrail #10): Phase 2 alert checking and
 *  search-index sync register here — the pipeline itself never changes. */
const hooks: PostIngestHook[] = [];

export function registerPostIngestHook(hook: PostIngestHook) {
  hooks.push(hook);
}

export async function runPostIngestHooks(events: PriceChangeEvent[]) {
  for (const hook of hooks) {
    try {
      await hook(events);
    } catch (err) {
      console.error("post-ingest hook failed", err);
    }
  }
}
