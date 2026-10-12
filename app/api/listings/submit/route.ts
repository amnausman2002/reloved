import { NextResponse } from "next/server";
import { z } from "zod";
import { userFromIdToken } from "@/lib/firebase/admin";
import { submitListing, upsertSellerProfile } from "@/lib/data/listings";
import {
  BRANDS,
  CATEGORIES,
  CITIES,
  CONDITION_VALUES,
  MATERIALS,
  CLOTHING_SIZES,
  SHOE_SIZES,
  MIN_LISTING_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "@/lib/constants";

// POST /api/listings/submit
//
// The only way a listing gets into Firestore. firestore.rules denies every
// client write to /listings, so this route and the Admin SDK behind it are the
// whole road in.
//
// Two things it will not take on trust:
//   - Who she is. The seller id comes from a verified ID token, never from the
//     request body. A browser can put any id it likes in a body.
//   - What the listing says. Every enum is checked against lib/constants here,
//     not just in the form, because the form is just JavaScript someone else
//     can skip.
//
// Status is always "pending". There is no parameter for it, deliberately:
// nothing a seller sends should be able to put her own listing live.

const photoSchema = z.object({
  url: z.string().url(),
  position: z.number().int().min(0).max(MAX_LISTING_PHOTOS - 1),
  is_cover: z.boolean(),
  quality_flags: z
    .object({
      blurry: z.boolean(),
      dark: z.boolean(),
      busy_background: z.boolean(),
      blends_into_background: z.boolean(),
      item_cropped: z.boolean(),
      crooked: z.boolean(),
    })
    .nullable(),
});

const bodySchema = z.object({
  idToken: z.string().min(1),
  account: z.object({
    fullName: z.string().trim().min(1).max(80),
    /** National part, no country code. Saved as E.164 below. */
    phone: z.string().trim().regex(/^3\d{9}$/).nullable(),
  }),
  listing: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    brand: z.enum(BRANDS),
    brandOther: z.string().trim().max(60),
    category: z.enum(CATEGORIES),
    colour: z.string().trim().max(40),
    size: z.enum([...CLOTHING_SIZES, ...SHOE_SIZES]).nullable(),
    condition: z.enum(CONDITION_VALUES),
    isReplica: z.boolean(),
    // Whole rupees. Comes off the form as a digits-only string.
    price: z.string().regex(/^\d+$/),
    city: z.enum(CITIES.map((item) => item.value) as [string, ...string[]]),
    material: z.enum(MATERIALS.map((item) => item.value) as [string, ...string[]]).or(z.literal("")),
  }),
  photos: z.array(photoSchema).min(MIN_LISTING_PHOTOS).max(MAX_LISTING_PHOTOS),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read that." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Some details were missing or did not look right." },
      { status: 400 },
    );
  }

  const { idToken, account, listing, photos } = parsed.data;

  // Who she is, from Google's signature rather than from the body.
  const user = await userFromIdToken(idToken);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Your sign-in has expired. Sign in and try again." },
      { status: 401 },
    );
  }

  // Exactly one cover, which is what the Photo table in the PRD requires.
  const covers = photos.filter((photo) => photo.is_cover).length;
  if (covers !== 1) {
    return NextResponse.json(
      { ok: false, error: "Pick one photo to lead the listing." },
      { status: 400 },
    );
  }

  if (listing.brand === "other" && !listing.brandOther) {
    return NextResponse.json({ ok: false, error: "Which brand is it?" }, { status: 400 });
  }

  try {
    // First name only. A buyer sees "Sara", never "Sara Khan".
    const displayName = account.fullName.split(/\s+/)[0];

    await upsertSellerProfile({
      uid: user.uid,
      email: user.email,
      display_name: displayName,
      // E.164, which is what the PRD stores and what a WhatsApp link needs.
      phone: account.phone ? `+92${account.phone}` : null,
      city: listing.city as never,
    });

    const listingId = await submitListing({
      seller_id: user.uid,
      title: listing.title,
      description: listing.description,
      brand: listing.brand,
      brand_other: listing.brand === "other" ? listing.brandOther : null,
      category: listing.category,
      colour: listing.colour || null,
      size: listing.size,
      material: listing.material ? (listing.material as never) : null,
      condition: listing.condition,
      is_replica: listing.isReplica,
      asking_price: Number(listing.price),
      city: listing.city as never,
      photos,
    });

    return NextResponse.json({ ok: true, listingId });
  } catch (error) {
    // Never leak a stack trace to the browser. The server log is where we look.
    console.error("submit listing failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not save your listing. Try again in a moment." },
      { status: 500 },
    );
  }
}
