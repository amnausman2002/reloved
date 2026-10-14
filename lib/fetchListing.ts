"use client";

// Fetching one listing from the browser, for the item page.
//
// Signed in or not: the token is sent when there is one, because it is what
// lets a seller open her own listing while it is still pending. Without it she
// gets the same answer a stranger would, which for a pending listing is "not
// found", and she would be told her own listing does not exist.

import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";
import type { ListingDetail } from "@/lib/data/listing";

export type { ListingDetail } from "@/lib/data/listing";

export type FetchListingResult =
  | { status: "found"; listing: ListingDetail }
  | { status: "missing" }
  | { status: "error" };

export type ContactSellerResult =
  | { ok: true; phone: string }
  | { ok: false; needsAccount: true }
  | { ok: false; needsAccount: false; error: string };

/** Records the tap and gets the seller's number back.
 *
 *  The number arrives here and nowhere else, which is what stops the
 *  catalogue being a list of phone numbers. A signed-out buyer gets
 *  needsAccount, which is what opens the gate. */
export async function contactSeller(listingId: string): Promise<ContactSellerResult> {
  if (!firebaseConfigured()) {
    return { ok: false, needsAccount: false, error: "Accounts are not switched on yet." };
  }

  const auth = firebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return { ok: false, needsAccount: true };

  try {
    const token = await user.getIdToken();
    const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/contact`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);

    if (response.status === 401) return { ok: false, needsAccount: true };
    if (!response.ok || !body?.ok) {
      return {
        ok: false,
        needsAccount: false,
        error: body?.error ?? "We could not open WhatsApp. Try again in a moment.",
      };
    }
    return { ok: true, phone: body.phone as string };
  } catch {
    return {
      ok: false,
      needsAccount: false,
      error: "We could not reach the internet. Check your connection.",
    };
  }
}

export async function fetchListing(id: string): Promise<FetchListingResult> {
  if (!firebaseConfigured()) return { status: "missing" };

  try {
    const auth = firebaseAuth();
    // Wait for the session to be restored before asking who she is.
    //
    // Firebase reads the saved account out of IndexedDB a tick or two after the
    // page loads, so currentUser is null for the first moments of every visit.
    // The item page fetches on mount, which lands inside that window: without
    // this wait a seller looked anonymous to our own route, and her pending
    // listing came back "Listing not found" to the person who posted it.
    await auth.authStateReady();

    const headers: Record<string, string> = {};
    const user = auth.currentUser;
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

    const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
      headers,
      // She can be looking at this a second after editing it, and a listing
      // that goes live should not keep showing as pending.
      cache: "no-store",
    });

    if (response.status === 404) return { status: "missing" };
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return { status: "error" };
    return { status: "found", listing: body.listing };
  } catch {
    // Offline. Distinct from "missing" so the page can say so rather than
    // claiming the listing does not exist.
    return { status: "error" };
  }
}
