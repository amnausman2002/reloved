import { NextResponse } from "next/server";
import { userFromIdToken } from "@/lib/firebase/admin";
import { markListingSold } from "@/lib/data/seller";

// POST /api/listings/[id]/sold
//
// The one status change a seller makes herself. Everything else about a
// listing's status is ours: only an admin sets live or rejected, and the rules
// deny the browser every write to /listings, so this route is the whole road.
//
// Deliberately not a general "set the status" route. It can do one thing, in
// one direction, which means there is no shape of request that can put a
// listing live without passing the queue.
//
// Who she is comes from the token. The listing id in the path is checked
// against her uid on the server; a browser can ask about any id it likes.

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
    const result = await markListingSold(user.uid, id);
    if (result.ok) return NextResponse.json({ ok: true });

    // Someone else's listing is answered as not found, the same as a listing
    // that does not exist, so this cannot be used to find out what another
    // seller has.
    if (result.reason === "wrong_status") {
      return NextResponse.json(
        { ok: false, error: "Only a live listing can be marked sold." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  } catch (error) {
    console.error("mark sold failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not update your listing. Try again in a moment." },
      { status: 500 },
    );
  }
}
