# Contracts: Duplicate Detection — Page & Actions

## Page route

`GET /:locale/admin/catalog/duplicates` — admin-only (`getAdminUser` → `AdminGate` for
non-admins, FR-001), `dynamic = "force-dynamic"`, English-only (FR-009).

Renders `findDuplicateCandidates(100)` as a list of pairs, most-similar first. Each pair card
shows, for **both** products: bilingual name, brand, first image (if any), offer count,
variant count, and the pair's similarity score. Each card offers:

- **Merge → keep A** and **Merge → keep B** (explicit survivor choice, US2/AC3), and
- **Not a duplicate** (dismiss).

Empty state when no candidates remain (FR-007).

## Actions (`.../duplicates/actions.ts`, `"use server"`)

Both guard with `await getAdminUser()` first and `revalidatePath("/admin/catalog/duplicates")`
after.

### `mergeAction(formData)`
- **Input**: `survivorId`, `absorbedId` (both int, hidden fields set by the chosen button).
- **Behavior**: `mergeProducts(absorbedId, survivorId)` (existing) — offers/history/variants/
  favorites/alerts move to the survivor; the absorbed product is deleted (FR-004).
- **Idempotent-ish**: if the absorbed product was already merged/deleted, `mergeProducts`
  throws "product not found"; the action swallows a missing-product case so the page just
  reflects current state on reload (edge case: concurrent resolution).

### `dismissAction(formData)`
- **Input**: `aId`, `bId` (int).
- **Behavior**: `dismissDuplicatePair(aId, bId)` — canonicalizes to `(min,max)` and upserts a
  `duplicate_dismissals` row (FR-005/FR-006). Idempotent; no-op if already present.

## Library surface (`lib/admin/duplicates.ts`)

- `findDuplicateCandidates(limit = 100): Promise<DuplicateCandidate[]>` — read-only ranked
  candidates, excluding dismissed pairs, within category+brand groups (SC-005).
- `scoreProductPair(a, b): number` — symmetric, brand-gated similarity via the shared
  `lib/ingest/similarity.ts` helpers.
- `dismissDuplicatePair(idA, idB): Promise<void>` — canonical upsert.

## Reused / shared

- `mergeProducts` (`lib/admin/catalog.ts`) — unchanged.
- `lib/ingest/similarity.ts` — pure helpers extracted from `match.ts` (imported by both).
