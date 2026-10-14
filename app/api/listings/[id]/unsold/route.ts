import { NextResponse } from "next/server";
import { userFromIdToken } from "@/lib/firebase/admin";
import { markListingUnsold } from "@/lib/data/seller";

// POST /api/listings/[id]/unsold
//
// Undoes the one beside it. Sold back to live, on her own listing, and nothing
// else: see lib/data/seller.ts for why this goes straight back to live rather
// than through the queue a second time.
//
// A separate route from /sold rather than one that takes a status, for the same
// reason as before: a route that accepts a status is a route someone will
// eventually point at "live" from "pending".

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
  const user = await userFromIdToken(idToken);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Your sign-in has expired. Sign in and try again." },
      { status: 401 },
    );
  }

  try {
    const result = await markListingUnsold(user.uid, id);
    if (result.ok) return NextResponse.json({ ok: true });

    if (result.reason === "wrong_status") {
      return NextResponse.json(
        { ok: false, error: "Only a sold listing can be put back." },
        { status: 409 },
      );
    }
    // Someone else's listing answers the same as one that does not exist.
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  } catch (error) {
    console.error("mark unsold failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not update your listing. Try again in a moment." },
      { status: 500 },
    );
  }
}
