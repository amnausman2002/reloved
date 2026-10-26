import { NextResponse } from "next/server";
import { z } from "zod";
import { userFromIdToken } from "@/lib/firebase/admin";
import { updateListingAs } from "@/lib/data/listing";
import {
  BRANDS,
  CATEGORIES,
  CITIES,
  CONDITION_VALUES,
  MATERIALS,
  CLOTHING_SIZES,
  MIN_LISTING_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "@/lib/constants";

// POST /api/listings/[id]/update
//
// The seller edits her own listing here. firestore.rules closes direct client
// writes to /listings and /photos on purpose, so this is the only road in. The
// permission check happens on the server, by matching the ID token's uid
// against the listing's seller_id.
//
// Two kinds of patch, driven by the listing's current status. The server
// trusts the current status, not the one the browser sends: a race where the
// listing goes from live to sold between fetch and save is answered as 409
// rather than being quietly applied as a sold-listing edit.
//
//   live       Appends new photos, lowers the price, changes the description.
//              Every other field is locked and will be rejected if sent.
//   rejected   Full replacement. Status goes back to pending for us to review.
//
// Pending, sold, expired and hidden are not editable from here.

const livePatchSchema = z.object({
  kind: z.literal("live"),
  description: z.string().trim().max(2000),
  // Digits only. The form keeps the field as a string.
  price: z.string().regex(/^\d+$/),
  appendedPhotos: z
    .array(z.object({ url: z.string().url() }))
    // She can add zero (she might just be lowering the price) up to filling the
    // slot to the ceiling. The listing is already past the two-photo minimum,
    // so there is no lower bound here.
    .max(MAX_LISTING_PHOTOS),
});

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

const rejectedPatchSchema = z.object({
  kind: z.literal("rejected"),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  brand: z.enum(BRANDS),
  brandOther: z.string().trim().max(60),
  category: z.enum(CATEGORIES),
  size: z.enum(CLOTHING_SIZES).nullable(),
  condition: z.enum(CONDITION_VALUES),
  isReplica: z.boolean(),
  price: z.string().regex(/^\d+$/),
  city: z.enum(CITIES.map((item) => item.value) as [string, ...string[]]),
  material: z.enum(MATERIALS.map((item) => item.value) as [string, ...string[]]).or(z.literal("")),
  photos: z.array(photoSchema).min(MIN_LISTING_PHOTOS).max(MAX_LISTING_PHOTOS),
});

const bodySchema = z.object({
  idToken: z.string().min(1),
  patch: z.discriminatedUnion("kind", [livePatchSchema, rejectedPatchSchema]),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read that." }, { status: 400 });
  }
  if (!parsed.success) {
    // Same reasoning as the submit route: she gets one calm sentence, we get
    // the field that actually failed.
    console.warn(
      "update listing rejected:",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
    return NextResponse.json(
      { ok: false, error: "Some details were missing or did not look right." },
      { status: 400 },
    );
  }

  const { idToken, patch } = parsed.data;

  const user = await userFromIdToken(idToken);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Your sign-in has expired. Sign in and try again." },
      { status: 401 },
    );
  }

  try {
    if (patch.kind === "rejected") {
      // Mirrors the submit route: exactly one cover, and if brand is "other"
      // there has to be a brand_other.
      const covers = patch.photos.filter((photo) => photo.is_cover).length;
      if (covers !== 1) {
        return NextResponse.json(
          { ok: false, error: "Pick one photo to lead the listing." },
          { status: 400 },
        );
      }
      if (patch.brand === "other" && !patch.brandOther) {
        return NextResponse.json({ ok: false, error: "Which brand is it?" }, { status: 400 });
      }
    }

    const result =
      patch.kind === "live"
        ? await updateListingAs(user.uid, id, {
            kind: "live",
            description: patch.description,
            askingPrice: Number(patch.price),
            appendedPhotos: patch.appendedPhotos,
          })
        : await updateListingAs(user.uid, id, {
            kind: "rejected",
            title: patch.title,
            description: patch.description,
            brand: patch.brand,
            brandOther: patch.brand === "other" ? patch.brandOther : null,
            category: patch.category,
            size: patch.size,
            material: patch.material ? (patch.material as never) : null,
            condition: patch.condition,
            isReplica: patch.isReplica,
            askingPrice: Number(patch.price),
            city: patch.city as never,
            photos: patch.photos,
          });

    if (result.ok) return NextResponse.json({ ok: true });

    if (result.reason === "not_found") {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }
    if (result.reason === "wrong_status") {
      // 409: the current status does not allow the edit she is trying to make.
      // Includes "the listing moved between fetch and save".
      return NextResponse.json(
        { ok: false, error: "This listing can't be edited any more." },
        { status: 409 },
      );
    }
    if (result.reason === "price_higher") {
      return NextResponse.json(
        { ok: false, error: "You can only lower the price on a live listing." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Some details were missing or did not look right." },
      { status: 400 },
    );
  } catch (error) {
    console.error("update listing failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not save your changes. Try again in a moment." },
      { status: 500 },
    );
  }
}
