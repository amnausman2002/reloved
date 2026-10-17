/** A local id for a photo or a bulk card in this tab, nothing to do with the
 *  Listing id.
 *
 *  crypto.randomUUID() exists only in a secure context, so it is there on
 *  localhost and on https but undefined when the phone opens the dev server
 *  over http on the local network. That is exactly how we test on a real
 *  phone, so fall back rather than throw. */
export function localId(prefix = "photo"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
