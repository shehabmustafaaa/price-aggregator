# Feature Specification: Recently-Viewed Products

**Feature Branch**: `010-recently-viewed`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Recently-viewed products — localStorage, no accounts needed.
Small. When a shopper opens a product page, remember it on their device; show a
'recently viewed' strip so they can jump back to products they looked at, without needing an
account."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jump back to products I just looked at (Priority: P1)

A shopper browses several phones, then wants to return to one they saw a few minutes ago
without re-searching. A "recently viewed" strip shows the products they opened most recently,
newest first, and clicking one reopens its page.

**Why this priority**: This is the whole feature — a fast path back to products the shopper
already showed interest in, with zero friction (no login, no setup). Without the strip there
is nothing to deliver.

**Independent Test**: Open three different product pages, then go to the home page (or a page
showing the strip); confirm those three appear, most-recently-viewed first, and clicking one
navigates to its product page.

**Acceptance Scenarios**:

1. **Given** a shopper has opened one or more product pages, **When** they view a page that
   shows the recently-viewed strip, **Then** they see those products, most-recent first, each
   with its name and image, and clicking one opens that product.
2. **Given** a shopper reopens a product they already viewed, **When** the strip is shown
   again, **Then** that product moves to the front and is not duplicated.
3. **Given** a shopper has viewed more products than the strip holds, **When** the strip is
   shown, **Then** only the most-recent N are kept and older entries drop off.
4. **Given** a shopper closes the browser and returns later on the same device/browser,
   **When** they view the strip, **Then** their recently-viewed products are still there.
5. **Given** a shopper has never opened a product, **When** they view a page that could show
   the strip, **Then** the strip is absent (or shows nothing) — no empty box or error.

---

### Edge Cases

- On a product's own page, that product is not shown as a "recently viewed" suggestion of
  itself (it may still be recorded for later, but is excluded from the strip on its own page).
- A recorded product that has since been removed/merged in the catalog: its link may 404;
  the strip should degrade gracefully (the entry can be shown from its stored snapshot, and a
  dead link is acceptable and self-corrects as it ages out) — it must not break the page.
- The strip renders in the shopper's current language (Arabic RTL / English LTR) using the
  stored bilingual name, regardless of which locale the product was originally viewed in.
- Private/incognito or storage-disabled browsers: the feature simply does nothing (no strip,
  no error) rather than failing the page.
- The recorded list is per-device/browser only; it is not tied to an account and does not
  sync across devices.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a shopper opens a product page, the system MUST record that product in the
  browser's local storage (device-only, no account, no server call), capturing enough to
  render a strip entry later (product identifier/slug, bilingual name, an image) and the view
  time/order.
- **FR-002**: The system MUST display a "recently viewed" strip listing the shopper's most
  recently viewed products, ordered most-recent first, each linking to its product page.
- **FR-003**: Re-viewing a product MUST move it to the front of the list without creating a
  duplicate (dedupe by product identity).
- **FR-004**: The list MUST be capped at a small maximum (most-recent N); older entries beyond
  the cap MUST be dropped.
- **FR-005**: The recorded list MUST persist across sessions on the same device/browser and
  MUST NOT be sent to or stored on the server, nor tied to any account.
- **FR-006**: The strip MUST render in the current locale (RTL for Arabic) using the stored
  bilingual name, and MUST exclude the product currently being viewed when shown on that
  product's own page.
- **FR-007**: When there are no recorded products (or storage is unavailable), the strip MUST
  render nothing — no empty container, no error, no impact on the rest of the page.
- **FR-008**: The strip MUST NOT display a price (prices require fresh server data and must
  never be shown stale — the strip is a navigation aid, not a price surface); it shows name +
  image and links to the live product page where fresh prices are shown.

### Key Entities

- **Recently-Viewed Entry** (client-only, in browser local storage): a lightweight snapshot of
  a viewed product — its slug/identifier, `nameEn`/`nameAr`, an image URL, and a view
  timestamp/order. No server-side entity; nothing persisted in the database.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After viewing several products, a shopper can return to any of them from the
  recently-viewed strip in one click, without searching again.
- **SC-002**: Re-viewing a product never produces a duplicate strip entry; the just-viewed
  product is always at the front.
- **SC-003**: Recently-viewed products survive a browser restart on the same device.
- **SC-004**: No recently-viewed data is transmitted to or stored on the server (verifiable:
  no network request carries it, no database row is created).
- **SC-005**: On a browser with storage disabled or in private mode, product pages and any
  page that could show the strip continue to work normally with the strip simply absent.

## Assumptions

- The strip shows product **name + image only**, not price — this keeps the feature fully
  client-side (no server round-trip) and avoids ever showing a stale price (constitution III).
  Fresh prices live on the product page the entry links to.
- Storing a small snapshot (slug, bilingual name, image) at view time is acceptable; if the
  catalog later renames/removes the product, the snapshot may be slightly out of date until it
  ages out of the list — an acceptable trade-off for a device-only convenience feature.
- The cap is a small number (planning will pick the exact value, e.g. ~10–12) sufficient for
  "jump back to what I just looked at"; this is not a full browsing-history feature.
- The strip is shown on high-traffic surfaces (home page and product pages); exact placement
  is an implementation detail chosen during planning.
- Out of scope: cross-device sync, account-tied history, a dedicated "history" page,
  clearing/managing individual entries (beyond natural aging), and any analytics/tracking of
  views (the existing outbound-click tracking is unrelated and unchanged).
