import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, isAdmin, userFromIdToken } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/data/types";
import { runReview } from "@/lib/ai/review";

// POST /api/admin/review — the AI notes beside a pending listing in the queue
// (approval copilot and catalogue-photo detection, lib/ai/review.ts).
//
// Admins only, checked the same way as /api/admin/moderate: the token says who
// is asking, is_admin says she is one of us. Anyone else gets 404, so this
// Gemini call is out of reach of the public and of bots.
//
// Advisory only. It writes nothing: no field stores the notes yet, because
// that would be a data model change. Always 200 on an AI failure, so the
// queue just shows "AI notes unavailable".

export const runtime = "nodejs";

const bodySchema = z.object({
  idToken: z.string().min(1),
  listingId: z.string().min(1),
});

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

  const user = await userFromIdToken(parsed.data.idToken);
  if (!user || !(await isAdmin(user.uid))) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const db = adminDb();
  const { listingId } = parsed.data;
  const [listingSnap, photoSnap] = await Promise.all([
    db.collection(COLLECTIONS.listings).doc(listingId).get(),
    db.collection(COLLECTIONS.photos).where("listing_id", "==", listingId).get(),
  ]);
  if (!listingSnap.exists) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const listing = listingSnap.data()!;
  const photoUrls = photoSnap.docs
    .map((photo) => ({ url: photo.get("url") as string, position: (photo.get("position") as number) ?? 0 }))
    .sort((a, b) => a.position - b.position)
    .map((photo) => photo.url)
    .filter(Boolean);

  const result = await runReview({
    title: listing.title ?? "",
    brand: listing.brand ?? "unknown",
    brandOther: listing.brand_other ?? null,
    category: listing.category ?? "",
    condition: listing.condition ?? "",
    description: listing.description ?? "",
    isReplica: listing.is_replica === true,
    photoUrls,
  });

  return NextResponse.json(result);
}
