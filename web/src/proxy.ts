import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Localize everything except API routes, outbound redirects, and static files.
  matcher: "/((?!api|go|_next|_vercel|.*\\..*).*)",
};
