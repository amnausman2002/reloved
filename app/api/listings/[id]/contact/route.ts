import { NextResponse } from "next/server";
import { userFromIdToken } from "@/lib/firebase/admin";
import { recordContact } from "@/lib/data/contact";
import { MAX_CONTACTS_PER_DAY } from "@/lib/data/types";

// POST /api/listings/[id]/contact
//
// The buyer tapped Message seller. This records the ContactEvent and answers
// with the seller's number, and it is the only place that number is ever sent
// to a browser.
//
// That is the point of the round trip. Shipping the number with the listing
// made every live listing's phone number readable by anyone who opened the
// page, which turned the catalogue into a phone book. Now a number costs a
// signed-in account and a row in the log, capped at 10 a day.
//
// Sign-in is required, per the PRD: she browses and searches with no account,
// and is asked for one the first time she taps this.

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
  const user = await userFromIdToken(idToken);
  if (!user) {
    // The gate on the item page opens on this, so the wording is what a buyer
    // sees if her session expired while she was reading.
    return NextResponse.json(
      { ok: false, error: "Log in to message the seller." },
      { status: 401 },
    );
  }

  try {
    const result = await recordContact(user.uid, id);
    if (result.ok) return NextResponse.json({ ok: true, phone: result.phone });

    switch (result.reason) {
      case "rate_limited":
        return NextResponse.json(
          {
            ok: false,
            error: `You can message ${MAX_CONTACTS_PER_DAY} sellers a day. Try again tomorrow.`,
          },
          { status: 429 },
        );
      case "no_phone":
        return NextResponse.json(
          { ok: false, error: "This seller has not added a number yet." },
          { status: 409 },
        );
      case "own_listing":
        return NextResponse.json(
          { ok: false, error: "This is your own listing." },
          { status: 409 },
        );
      default:
        return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }
  } catch (error) {
    console.error("contact failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not open WhatsApp. Try again in a moment." },
      { status: 500 },
    );
  }
}
