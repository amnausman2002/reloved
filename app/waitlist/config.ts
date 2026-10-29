// Everything about the waitlist page that is ours to change without touching
// a component: our WhatsApp number, the prefilled messages, the footer links.

/** Our WhatsApp, E.164, behind the footer's WhatsApp link. */
export const WAITLIST_WHATSAPP_NUMBER = "+923094505552";

/** What she forwards to a friend. The link is added after it. */
export const SHARE_MESSAGE =
  "Hey, your closet called. It needs some space 👀 Reloved is a new app for selling preloved clothes in Pakistan, with zero commission. Join the waitlist to be one of their first sellers:";

export const INSTAGRAM_HANDLE = "reloved.community";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
export const CONTACT_EMAIL = "reloved.isb@gmail.com";

/** wa.me wants digits only: no plus, no spaces. No number opens her own
 *  contact picker, which is what sharing needs. */
export function whatsappLink(message: string, number?: string): string {
  const to = number ? number.replace(/\D/g, "") : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

/** The link a friend receives, on whatever domain this page is open on, so it
 *  keeps working once shop-reloved.com points here. */
export function shareUrl(): string {
  return `${window.location.origin}/waitlist?utm_source=share`;
}
