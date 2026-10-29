import { NextResponse, type NextRequest } from "next/server";
import { WAITLIST_DOMAIN, isWaitlistHost } from "@/app/waitlist/domain";

// Runs before every page request. It only acts on the waitlist's domain,
// shop-reloved.com, where it makes the site the waitlist page and nothing
// else. Every other address, including the App Hosting one, gets the full app
// untouched.
//
//   www.shop-reloved.com/            shows the waitlist (the URL stays "/")
//   www.shop-reloved.com/waitlist    redirects to "/", query string kept
//   www.shop-reloved.com/<anything>  redirects to "/": no way into the app
//   shop-reloved.com/...             redirects to the www address
//
// API routes, Next's own files and anything with a file extension (photos,
// videos, the favicon) are left out by the matcher, so the form can still
// post and the page's media still load.

export function proxy(request: NextRequest) {
  // Behind App Hosting the public domain arrives as x-forwarded-host.
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .split(":")[0]
    .trim();
  if (!isWaitlistHost(host)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  // Built from the public domain, not request.url, which behind App Hosting
  // can carry the server's internal address.
  const toWaitlistHome = new URL(`/${search}`, `https://${WAITLIST_DOMAIN}`);

  if (host.toLowerCase() !== WAITLIST_DOMAIN) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${WAITLIST_DOMAIN}`), 308);
  }

  if (pathname === "/") {
    const page = request.nextUrl.clone();
    page.pathname = "/waitlist";
    return NextResponse.rewrite(page);
  }

  return NextResponse.redirect(toWaitlistHome, 307);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)"],
};
