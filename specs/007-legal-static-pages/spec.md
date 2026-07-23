# Feature Specification: Legal & Static Pages

**Feature Branch**: `007-legal-static-pages`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Legal and static pages: Privacy Policy, Terms of Service, and
Contact pages in Arabic and English (RTL-aware), matching the existing About page style, with
footer links to all of them on every page. Needed for AdSense approval."

## Clarifications

### Session 2026-07-23

- Q: How should visitors contact the owner on the Contact page — static email link, a
  contact form, or both? → A: Both — an in-site contact form as the primary method, with the
  contact email address also shown as a fallback.
- Q: Which contact email address is published and receives form submissions? → A: The
  owner's existing Gmail address (works today, no domain-mail setup); it may be swapped for
  a domain address later via configuration without changing this spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the legal pages (Priority: P1)

A visitor (or an AdSense reviewer) wants to read the site's Privacy Policy and Terms of
Service in their language, reachable from any page, to understand how their data is handled
and under what terms the service is offered.

**Why this priority**: The stated goal is AdSense approval, which requires a discoverable
Privacy Policy (and benefits from Terms); without these pages the monetization goal is
blocked. This is the feature's reason to exist.

**Independent Test**: From the home page, follow the footer link to the Privacy Policy in
both `/ar` and `/en`; verify the full policy renders in the correct language with correct
text direction, styled consistently with the About page.

**Acceptance Scenarios**:

1. **Given** any public page in either locale, **When** the visitor scrolls to the footer,
   **Then** they see links to Privacy Policy, Terms of Service, Contact, and About, labeled
   in the current locale.
2. **Given** the Arabic locale, **When** the visitor opens the Privacy Policy or Terms page,
   **Then** the content is in Arabic with right-to-left layout; the English locale shows
   English left-to-right content.
3. **Given** the Privacy Policy page, **Then** it discloses at minimum: what data the site
   collects (accounts, favorites/alerts, outbound-click and search logs, cookies), how it is
   used, third-party advertising/analytics disclosure (Google AdSense cookies once ads are
   live), and how to contact the owner about privacy concerns.
4. **Given** the Terms of Service page, **Then** it states at minimum: prices are collected
   from third-party stores and may be inaccurate or stale, purchases happen on the stores'
   sites (the site is not the seller), and limitation of liability for price errors.

---

### User Story 2 - Contact the site owner (Priority: P2)

A visitor (shopper with a question, store owner disputing a listing, or the AdSense reviewer
checking contactability) wants a way to reach the site owner.

**Why this priority**: Required for AdSense trust signals and for legitimate takedown/price
dispute requests, but the legal pages alone unblock most of the approval requirement.

**Independent Test**: Open the Contact page from the footer in both locales; verify a working
contact method is presented.

**Acceptance Scenarios**:

1. **Given** the Contact page in either locale, **Then** the visitor sees a contact form
   (name optional, email, message) as the primary method, plus the contact email address as
   a visible fallback, with a short bilingual explanation of what to contact the owner about
   (questions, wrong prices, listing removal requests).
2. **Given** a visitor submits the form with a valid email and non-empty message, **Then**
   the message is delivered to the owner and the visitor sees a localized success
   confirmation without losing their place on the page.
3. **Given** a visitor submits the form with a missing/invalid email or empty message,
   **Then** they see a localized validation error and their entered text is preserved.
4. **Given** message delivery fails (e.g., mail service unavailable), **Then** the visitor
   sees a localized error suggesting the fallback email address instead.
5. **Given** a visitor clicks the fallback contact email link, **Then** their mail client
   opens pre-addressed to the site's contact address.

---

### Edge Cases

- A visitor lands directly on a legal page URL in one locale and switches language — the
  page must switch to the same page in the other locale, not fall back to the home page.
- Legal pages must render for logged-out visitors and crawlers (no account, no cookies
  accepted yet) — they are fully public.
- A store or user sends a removal/dispute request via the form or email — the Contact page's
  stated scope covers this; no in-site workflow is required (handled manually by the owner).
- A bot floods the contact form — abuse protection (honeypot + rate limit, FR-008) absorbs
  it without emailing the owner or degrading the page for real visitors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST provide three new public static pages — Privacy Policy, Terms of
  Service, and Contact — each available in Arabic (default, RTL) and English (LTR) at
  locale-prefixed URLs, fully translated (no mixed-language content within a locale).
- **FR-002**: The pages MUST match the existing About page's visual style and layout
  conventions (same typography, spacing, dark theme) so the static pages read as one set.
- **FR-003**: Every public page of the site MUST show footer links to Privacy Policy, Terms
  of Service, Contact, and About, labeled per the current locale, in both desktop and mobile
  layouts.
- **FR-004**: The Privacy Policy MUST accurately describe the site's actual data practices:
  account data (email, password, locale), favorites and price alerts, outbound-click
  logging, zero-result search logging, session cookies, and future third-party advertising
  (Google AdSense) cookies/identifiers, plus a contact route for privacy requests.
- **FR-005**: The Terms of Service MUST cover: informational nature of listed prices
  (collected from third-party stores, may be stale or wrong), the site is not the seller,
  store trademarks belong to their owners, acceptable use, and limitation of liability.
- **FR-006**: The Contact page MUST provide a contact form (optional name, required valid
  email, required message) that delivers submissions to the owner's contact address, with
  localized validation, success, and failure states; the contact email address MUST also be
  displayed as a fallback. The page states what requests it handles (general questions,
  wrong-price reports, listing removal/dispute requests).
- **FR-008**: The contact form MUST include basic abuse protection (at minimum a bot
  honeypot and per-visitor rate limiting) so it cannot be used to flood the owner's inbox;
  rejected submissions fail silently for bots and with a clear message for humans.
- **FR-007**: All three pages MUST be reachable by crawlers without authentication and be
  indexable (no login wall, no noindex).

### Key Entities

None — these are static content pages; no new stored data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any page on the site, a visitor reaches any of the three pages in exactly
  one click (the footer link), in either locale.
- **SC-002**: 100% of the three pages render complete content in both locales with correct
  text direction and consistent styling with the About page.
- **SC-003**: The site passes the AdSense "required content" review item (privacy policy
  present and discoverable) on the next application attempt.
- **SC-004**: An emailed message to the published contact address reaches the owner's inbox.

## Assumptions

- Contact-form submissions are delivered by email to the owner (reusing the site's existing
  email-sending capability) and are not stored in the site's database; the existing "report
  wrong price" button still covers in-context price reports.
- The published contact address is the owner's existing Gmail address, supplied via
  configuration (not hardcoded into translations or page copy) so it can be swapped for a
  domain address later without a content rewrite.
- Legal copy is provided in plain language by the owner (drafted as part of implementation
  and reviewable); no lawyer review is in scope. Egypt is the governing market, consistent
  with the site's single-market scope.
- The About page already exists and its style is the template; no redesign of About is in
  scope (though it gains the shared footer links like every other page).
- AdSense itself (ad units, `ads.txt`, account setup) is out of scope — this feature only
  delivers the content-policy prerequisites.
- No cookie-consent banner is in scope; the Privacy Policy discloses cookies. (Can be added
  later if ad-network or regulatory requirements demand it.)
