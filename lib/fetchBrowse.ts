"use client";

// Live listings for the browse grid.
//
// No token: browse needs no account, so this never waits on Firebase and works
// for a visitor who has never signed in.
//
// Returns an empty list on any failure rather than throwing. Browse falling
// back to the sample items is a worse grid; browse throwing is a blank page.

import type { BrowseListing } from "@/lib/data/browse";

export type { BrowseListing } from "@/lib/data/browse";

/** The last answer, kept for the life of the tab.
 *
 *  Browse rewrites its own URL whenever a filter changes, and that remounts the
 *  page, which empties its state and starts this fetch again. Without somewhere
 *  to remember the answer, every filter tap made the real listings vanish from
 *  the grid for a moment and come back. Returning the cached list immediately
 *  and refreshing behind it means the grid never loses them.
 *
 *  Not a long-lived cache: a reload clears it. */
let cached: BrowseListing[] | null = null;
let inFlight: Promise<BrowseListing[]> | null = null;

export function cachedLiveListings(): BrowseListing[] | null {
  return cached;
}

/** Throws the cache away, so the next visit to browse asks the server again.
 *
 *  Called when something this tab did changes what is live: marking a listing
 *  sold takes it out of the grid, and the seller is the one person guaranteed
 *  to go looking. */
export function clearLiveListingsCache(): void {
  cached = null;
}

export async function fetchLiveListings(): Promise<BrowseListing[]> {
  // One request at a time, however many copies of the page ask for it.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch("/api/listings", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) return cached ?? [];
      cached = body.listings as BrowseListing[];
      return cached;
    } catch {
      return cached ?? [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
