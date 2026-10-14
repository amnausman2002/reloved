import { NextResponse } from "next/server";
import { publicSeller } from "@/lib/data/seller";

// GET /api/sellers/[id]
//
// A seller's public profile: her name, city, bio, sold count and whatever she
// has live. No account needed, because browse needs none and this is reached
// from a listing.
//
// Her email and her phone number are not in the answer. That is the whole
// reason this is a route rather than a Firestore read: firestore.rules closes
// the users collection to the browser precisely because a user document holds
// both, and rules cannot hide individual fields. This picks the safe ones.

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const seller = await publicSeller(id);
    if (!seller) {
      return NextResponse.json({ ok: false, error: "Seller not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, seller });
  } catch (error) {
    console.error("seller read failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not load this profile. Try again in a moment." },
      { status: 500 },
    );
  }
}
