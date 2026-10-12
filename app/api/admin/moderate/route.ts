import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, userFromIdToken } from "@/lib/firebase/admin";
import { moderate, setPhoneVerified } from "@/lib/data/admin";
import { REJECTION_REASON_VALUES } from "@/lib/constants";

// POST /api/admin/moderate
//
// Approve, reject, hide or restore a listing, and mark a seller's number as
// checked on WhatsApp.
//
// Permission is checked twice on purpose: the token proves who is asking, and
// is_admin on her user document proves she is one of us. CLAUDE.md says to
// enforce this on the server and in the rules, never by hiding buttons, and
// the Admin SDK behind this route ignores the rules entirely.

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("moderate"),
    idToken: z.string().min(1),
    listingId: z.string().min(1),
    action: z.enum(["approved", "rejected", "hidden", "restored"]),
    reason: z.enum(REJECTION_REASON_VALUES).nullable(),
  }),
  z.object({
    kind: z.literal("phone"),
    idToken: z.string().min(1),
    sellerId: z.string().min(1),
    verified: z.boolean(),
  }),
]);

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read that." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "That request did not look right." }, { status: 400 });
  }

  const body = parsed.data;

  const user = await userFromIdToken(body.idToken);
  if (!user || !(await isAdmin(user.uid))) {
    // Same answer for "not signed in" and "signed in but not an admin". No
    // reason to tell anyone which it was.
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    if (body.kind === "phone") {
      await setPhoneVerified(body.sellerId, body.verified);
      return NextResponse.json({ ok: true });
    }

    // A rejection without a reason would leave the seller an email that says
    // no and nothing else, which is the thing the four canned reasons exist
    // to prevent.
    if (body.action === "rejected" && !body.reason) {
      return NextResponse.json({ ok: false, error: "Pick a reason." }, { status: 400 });
    }

    await moderate({
      listingId: body.listingId,
      adminId: user.uid,
      action: body.action,
      reason: body.action === "rejected" ? body.reason : null,
    });

    // TODO: email the seller. The Trigger Email extension is not installed
    // yet, and the PRD is clear that silence is what makes sellers give up.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("moderate failed", error);
    return NextResponse.json({ ok: false, error: "That did not save. Try again." }, { status: 500 });
  }
}
