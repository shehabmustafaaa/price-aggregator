import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  // next-intl's hreflang `Link:` response header is built from the proxied
  // request, which is plain http:// behind nginx — contradicting the correct
  // https:// canonical/hreflang tags in the HTML. Disable it so the HTML
  // metadata (built from NEXT_PUBLIC_SITE_URL) is the single source of truth.
  alternateLinks: false,
});
