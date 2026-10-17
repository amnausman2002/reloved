import { NextResponse } from "next/server";
import { userFromIdToken } from "@/lib/firebase/admin";
import { mySellerData } from "@/lib/data/seller";
import { runDuplicateCheck, MAX_EARLIER_LISTINGS } from "@/lib/ai/duplicate";
import { allowAiCall } from "@/lib/ai/rateLimit";
import { validatePhotos } from "@/lib/ai/images";

// POST /api/ai/duplicate — has she already listed this item?
// Multipart: `photos` (her new photos, cover first) and `idToken`.
//
// Needs a signed-in seller, because it compares against her own listings:
// without a token there is nothing to compare, and bots get nothing. Always
// 200 with match: null on anything short of a match, because it is advisory
// and must never stand between her and the form.

export const runtime = "nodejs";

const NOTHING = { ok: true, match: null, skipped: true } as const;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(NOTHING);
  }

  const idToken = form.get("idToken");
  const user = typeof idToken === "string" ? await userFromIdToken(idToken) : null;
  if (!user) return NextResponse.json(NOTHING);

  const photos = form.getAll("photos").filter((value): value is File => value instanceof File);
  if (validatePhotos(photos)) return NextResponse.json(NOTHING);

  const mine = await mySellerData(user.uid);
  const earlier = (mine?.listings ?? [])
    .filter((listing) => listing.status === "live" || listing.status === "pending")
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      coverUrl: (listing.photos.find((photo) => photo.isCover) ?? listing.photos[0])?.url ?? "",
    }))
    .filter((listing) => listing.coverUrl)
    .slice(0, MAX_EARLIER_LISTINGS);

  // A first-time seller: nothing to compare, so no Gemini call is made.
  if (earlier.length === 0) return NextResponse.json(NOTHING);
  if (!allowAiCall(request)) return NextResponse.json(NOTHING);

  const result = await runDuplicateCheck(photos, earlier);
  return NextResponse.json(result.ok ? result : NOTHING);
}
