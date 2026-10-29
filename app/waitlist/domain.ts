// The waitlist's own domain. On it, the site is the waitlist and nothing else
// (see proxy.ts at the project root); everywhere else the full app is
// unchanged.

export const WAITLIST_DOMAIN = "www.shop-reloved.com";

/** Both spellings people type. The bare one is sent on to www. */
const WAITLIST_HOSTS = new Set([WAITLIST_DOMAIN, "shop-reloved.com"]);

export function isWaitlistHost(hostname: string): boolean {
  return WAITLIST_HOSTS.has(hostname.toLowerCase());
}
