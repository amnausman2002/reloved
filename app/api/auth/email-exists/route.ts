import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";

// POST /api/auth/email-exists
//
// Tells the sign-up screen whether an email already has an account, so she
// finds out on the screen where she typed it rather than at the very end,
// after she has also filled in a phone number.
//
// THIS IS AN EMAIL ENUMERATION ENDPOINT, deliberately. Anyone can ask it
// whether a given address has a Reloved account, which is a real if small
// privacy leak: "is this woman selling clothes online" is not nobody's
// business. Firebase turns its own client-side version of this off by default
// for exactly that reason, which is why this has to be a route of our own.
//
// It was judged worth it because the alternative is worse for the seller: she
// fills in a whole account, then a phone number, then gets told at submit that
// her email is taken. Revisit if it is ever abused.
//
// NOT RATE LIMITED YET. It needs the same App Check and rate limiting as the
// AI routes before any of this is deployed publicly (seller-flow-research.md,
// milestone M6). On a laptop it is fine.

const bodySchema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ exists: false });
  }

  // A malformed address cannot have an account, and saying so is not a leak.
  if (!parsed.success) return NextResponse.json({ exists: false });

  try {
    await adminAuth().getUserByEmail(parsed.data.email);
    return NextResponse.json({ exists: true });
  } catch {
    // auth/user-not-found, and anything else. If the lookup itself is broken
    // we say no: a false "that email is taken" would stop a new seller dead,
    // while a false "it is free" just defers her to the error she would have
    // got at submit anyway.
    return NextResponse.json({ exists: false });
  }
}
