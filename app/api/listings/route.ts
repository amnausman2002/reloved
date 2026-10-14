import { NextResponse } from "next/server";
import { liveListings } from "@/lib/data/browse";

// GET /api/listings
//
// The browse grid. Live listings only, newest first, and no account needed:
// the PRD is explicit that a buyer browses and searches with no sign-in at all.
//
// Nothing here is private. A live listing is one we have approved for everyone
// to see, and the fields returned are the ones already printed on its card.
// The seller's phone is not among them.
//
// Filtering and search still happen in the browser over the whole list, which
// is fine at soft-launch size. The moment this needs paging it should move to
// Firestore queries with the filters applied there.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listings = await liveListings();
    return NextResponse.json({ ok: true, listings });
  } catch (error) {
    console.error("browse read failed", error);
    // Browse must never be a blank page. The caller falls back to showing
    // whatever it already has rather than an error screen.
    return NextResponse.json(
      { ok: false, error: "We could not load listings. Try again in a moment." },
      { status: 500 },
    );
  }
}
