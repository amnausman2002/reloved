// Everything about the waitlist page that is ours to change without touching
// a component: our WhatsApp number, the prefilled messages, the footer links.

import { isWaitlistHost } from "./domain";

/** Our WhatsApp, E.164, behind the footer's WhatsApp link. */
export const WAITLIST_WHATSAPP_NUMBER = "+923094505552";

/** What she forwards to a friend. The link is added after it. */
export const SHARE_MESSAGE =
  "Hey, your closet called. It needs some space 👀 Reloved is a new app for selling preloved clothes in Pakistan, with zero commission. Join the waitlist to be one of their first sellers:";

export const INSTAGRAM_HANDLE = "reloved.community";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
export const CONTACT_EMAIL = "reloved.isb@gmail.com";

/** Straight to api.whatsapp.com, not wa.me: wa.me's redirect turns emoji into
 *  the "unknown character" box (checked 30 Oct). The number is digits only, no
 *  plus or spaces; no number opens her own contact picker, which is what
 *  sharing needs. */
export function whatsappLink(message: string, number?: string): string {
  const params = new URLSearchParams({ text: message });
  if (number) params.set("phone", number.replace(/\D/g, ""));
  return `https://api.whatsapp.com/send?${params}`;
}

/** The link a friend receives, on whatever domain this page is open on. On
 *  shop-reloved.com the waitlist is the home page, so the link is just the
 *  domain. */
export function shareUrl(): string {
  const path = isWaitlistHost(window.location.hostname) ? "/" : "/waitlist";
  return `${window.location.origin}${path}?utm_source=share`;
}
