"use client";

// A seller's public profile, for anyone looking at it who is not her.
//
// No token: this needs no account, the same as browse.

import type { PublicSeller } from "@/lib/data/seller";

export type { PublicSeller } from "@/lib/data/seller";

export type FetchSellerResult =
  | { status: "found"; seller: PublicSeller }
  | { status: "missing" }
  | { status: "error" };

export async function fetchPublicSeller(id: string): Promise<FetchSellerResult> {
  try {
    const response = await fetch(`/api/sellers/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) return { status: "missing" };
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return { status: "error" };
    return { status: "found", seller: body.seller };
  } catch {
    // Offline. Distinct from "missing", so the page can say so rather than
    // claiming she does not exist.
    return { status: "error" };
  }
}
