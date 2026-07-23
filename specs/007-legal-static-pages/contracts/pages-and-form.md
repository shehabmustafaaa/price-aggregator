# Contracts: Legal & Static Pages

## Public page routes (both locales, no auth, indexable)

| Route | Content |
|---|---|
| `GET /:locale/privacy` | Privacy Policy — data collected (accounts, favorites/alerts, outbound-click log, missed-search log, session cookie), usage, future AdSense/third-party cookies disclosure, privacy-contact route |
| `GET /:locale/terms` | Terms — prices are third-party/informational and may be stale or wrong; site is not the seller; store trademarks; acceptable use; liability limitation |
| `GET /:locale/contact` | Explanation of contactable topics + contact form + mailto fallback link |

All three render inside the existing `LegalPage` shell (About-page styling); AR = RTL,
EN = LTR via the layout's `dir`.

## Footer (every public page)

Locale-labeled links, in the layout footer: About · Privacy Policy · Terms of Service ·
Contact. Labels from `web/messages/{ar,en}.json` under a `footer` namespace.

## Contact form server action

`submitContactAction(formData)` in `web/src/app/[locale]/contact/actions.ts` → thin wrapper
over `sendContactMessage()` in `web/src/lib/contact/send.ts`.

- **Input fields**: `name?`, `email`, `message`, `website` (honeypot, visually hidden).
- **Outcomes** (returned state rendered by `ContactForm`, localized):
  - `ok` — email sent (or honeypot triggered: pretend-ok, nothing sent).
  - `invalid` — field-level validation failure; entered values preserved.
  - `rate_limited` — >3 submissions/hour from one IP.
  - `send_failed` — SMTP error; message suggests the fallback email address.
- **Never throws to the client**; no data persisted.
