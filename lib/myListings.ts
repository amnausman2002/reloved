"use client";

// Reading her own things, from the browser. The counterpart to lib/data/seller.ts.
//
// Two different routes in, and the difference is deliberate:
//
//   - Her listings go through GET /api/listings/mine, because they need their
//     cover photos and firestore.rules closes the photos collection to the
//     browser entirely.
//   - Her profile is read straight from Firestore, because the rules already
//     allow her to read her own user document and one document is not worth a
//     round trip through our server.
//
// Both return null rather than throwing. Nothing here is allowed to take a
// screen down: a seller who cannot load her listings should see an empty
// profile and a message, never a blank page.

import { doc, getDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb, firebaseConfigured } from "@/lib/firebase/client";
import { clearLiveListingsCache } from "@/lib/fetchBrowse";
import type { MySellerData } from "@/lib/data/seller";
import type { City } from "@/lib/constants";

export type { MyListing, MySellerData } from "@/lib/data/seller";

/** Her profile and every listing she has, at every status. */
export async function fetchMySellerData(): Promise<MySellerData | null> {
  if (!firebaseConfigured()) return null;
  // See lib/fetchListing.ts: currentUser is null for the first moments of every
  // page load, so asking without waiting answers "nobody" for a signed-in
  // seller.
  const auth = firebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/listings/mine", {
      headers: { Authorization: `Bearer ${token}` },
      // Her own listings change the moment she posts one. A cached answer here
      // is the bug this whole route exists to fix.
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return null;
    return { profile: body.profile, listings: body.listings };
  } catch {
    return null;
  }
}

/** Moves one of her listings between live and sold.
 *
 *  Returns true only when Firestore actually changed. The caller moves the row
 *  to the other tab on a true and leaves it alone otherwise: a row that slides
 *  into Sold and comes back as Live on the next load is worse than one that
 *  does not move at all. */
async function setSold(listingId: string, action: "sold" | "unsold"): Promise<boolean> {
  if (!firebaseConfigured()) return false;
  const auth = firebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const token = await user.getIdToken();
    const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return false;

    // Browse holds the live list for the life of the tab, so either direction
    // makes it wrong: an item she has just sold would still be sitting in
    // Kurtas, and one she has put back would still be missing from it.
    clearLiveListingsCache();
    return true;
  } catch {
    return false;
  }
}

/** She sold it. Live to sold. */
export function markSold(listingId: string): Promise<boolean> {
  return setSold(listingId, "sold");
}

/** She did not sell it after all. Sold back to live, and back into browse. */
export function markUnsold(listingId: string): Promise<boolean> {
  return setSold(listingId, "unsold");
}

/** Just the saved profile, read directly. Used by the sell flow, which needs
 *  her phone number and has no use for her listings. */
export async function fetchMyProfile(): Promise<{
  displayName: string | null;
  city: City | null;
  /** E.164, as stored. The sell flow shows it back to her as a national
   *  number, the same way she typed it. */
  phone: string | null;
} | null> {
  if (!firebaseConfigured()) return null;
  const auth = firebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const snap = await getDoc(doc(firebaseDb(), "users", user.uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      displayName: data.display_name ?? null,
      city: (data.city as City) ?? null,
      phone: data.phone ?? null,
    };
  } catch {
    // Offline, or the rules changed. The sell flow asks her for the number as
    // it always did.
    return null;
  }
}
