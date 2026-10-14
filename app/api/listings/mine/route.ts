import { NextResponse } from "next/server";
import { userFromIdToken } from "@/lib/firebase/admin";
import { mySellerData } from "@/lib/data/seller";

// GET /api/listings/mine
//
// Everything a seller's own profile page needs: her profile and every listing
// she has, at every status. Her listings she could read from the browser, since
// firestore.rules allows a seller to read her own at any status. Their photos
// she could not: that collection is closed to the browser entirely so that
// nobody can enumerate every photo we hold. So this route fetches both.
//
// Who she is comes from a verified ID token in the Authorization header, never
// from a parameter. There is deliberately no ?sellerId=: a route that took one
// would be a route that hands one seller another seller's phone number.
//
// The response includes her phone, which no buyer may ever see. That is safe
// here only because the answer is built from the token's own uid, so the only
// person who can ask for it is the person it belongs to. Never widen this
// route to take an id.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // "Authorization: Bearer <idToken>". The header rather than the body because
  // this is a GET, and rather than a cookie because the browser already holds
  // the token and can refresh it.
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
    const data = await mySellerData(user.uid);
    if (!data) {
      return NextResponse.json({ ok: false, error: "We could not find your profile." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    // A missing composite index shows up here first, with a link to create it
    // in the message. firestore.indexes.json already has the one this needs;
    // it may simply not be deployed yet.
    console.error("my listings failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not load your listings. Try again in a moment." },
      { status: 500 },
    );
  }
}
