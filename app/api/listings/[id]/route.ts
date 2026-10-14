import { NextResponse } from "next/server";
import { userFromIdToken, isAdmin } from "@/lib/firebase/admin";
import { getListingForViewer } from "@/lib/data/listing";

// GET /api/listings/[id]
//
// One listing, for the item page. Public for a live listing, because browse has
// to work with no account at all. A listing at any other status is readable
// only by the seller who owns it and by us.
//
// Sign-in is optional: no token simply means an anonymous visitor, who gets
// live listings and nothing else. That is why a missing token is not a 401 here
// the way it is on /api/listings/mine.
//
// A listing she may not see is answered as 404, not 403. A 403 would confirm
// that the id exists, which is a thing worth not confirming about a listing we
// rejected or auto-hid after two reports.
//
// This sits beside /api/listings/mine and /api/listings/submit. Next matches a
// named segment before a dynamic one, so those two keep working; a listing
// whose id was literally "mine" would not be reachable, and Firestore's 20
// character ids mean that cannot happen.

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
  const user = await userFromIdToken(idToken);
  const viewer = { uid: user?.uid ?? null, isAdmin: await isAdmin(user?.uid) };

  try {
    const result = await getListingForViewer(id, viewer);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, listing: result.listing });
  } catch (error) {
    console.error("listing read failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not load this listing. Try again in a moment." },
      { status: 500 },
    );
  }
}
