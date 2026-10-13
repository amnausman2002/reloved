// Every Firestore write for submitting a listing. Server side only.
//
// The PRD says listings and their status are written only by the server, and
// firestore.rules enforces that by denying all client writes to /listings. So
// this is the only road in, and the permission check has already happened by
// the time anything here runs.
//
// Photos are the exception: the browser uploads them straight to Cloud Storage
// under listings/{uid}/, which storage.rules allows. Sending 6 photos through
// a server route would double the transfer for no benefit. What arrives here
// is the resulting URLs.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, LISTING_LIFETIME_DAYS } from "./types";
import type { PhotoQualityFlags } from "./types";
import type { Brand, Category, City, ConditionValue, Material, Size } from "@/lib/constants";

export type SubmitPhoto = {
  url: string;
  position: number;
  is_cover: boolean;
  quality_flags: PhotoQualityFlags | null;
};

export type SubmitListingInput = {
  seller_id: string;
  title: string;
  description: string;
  brand: Brand;
  brand_other: string | null;
  category: Category;
  colour: string | null;
  size: Size | null;
  material: Material | null;
  condition: ConditionValue;
  is_replica: boolean;
  asking_price: number;
  city: City;
  photos: SubmitPhoto[];
};

export type SellerProfileInput = {
  uid: string;
  email: string | null;
  /** First name only. Everything after the first word is dropped before it
   *  gets here: a buyer sees "Sara", never "Sara Khan". */
  display_name: string;
  /** E.164. Saved unverified: Amna or Bismah confirms it from the queue by
   *  tapping the WhatsApp link, and only then is phone_verified_at set. */
  phone: string | null;
  city: City | null;
};

/** Creates or tops up the seller's user document.
 *
 *  merge: true because she may already exist as a buyer who contacted someone
 *  before she ever sold anything. The PRD is explicit that buyers, sellers and
 *  admins are one entity, so this must never clobber what is already there.
 *
 *  is_admin and the two verified timestamps are deliberately absent: setting
 *  them here would let the submit path grant privileges, which is exactly what
 *  firestore.rules forbids on the client side. They are only ever written by
 *  an admin action. */
export async function upsertSellerProfile(input: SellerProfileInput): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.users).doc(input.uid);
  const existing = await ref.get();

  const profile: Record<string, unknown> = {
    email: input.email,
    display_name: input.display_name,
    city: input.city,
  };

  // Only written when there is one. A returning seller who lists a second item
  // without retyping her number would otherwise have the saved one merged away
  // to null, and with it the WhatsApp button on every listing she has live.
  if (input.phone) profile.phone = input.phone;

  if (!existing.exists) {
    profile.created_at = FieldValue.serverTimestamp();
    profile.is_admin = false;
    profile.email_verified_at = null;
    profile.phone_verified_at = null;
    profile.bio = null;
    profile.avatar_url = null;
  }

  await ref.set(profile, { merge: true });
}

/** Writes the listing and its photos as one batch, at status "pending".
 *
 *  One batch so a listing can never exist without its photos, or the other way
 *  round. The admin queue reads both, and half a listing in the queue is worse
 *  than no listing.
 *
 *  Returns the new listing id. */
export async function submitListing(input: SubmitListingInput): Promise<string> {
  const db = adminDb();
  const batch = db.batch();

  const listingRef = db.collection(COLLECTIONS.listings).doc();
  const now = Timestamp.now();
  const expires = Timestamp.fromMillis(
    now.toMillis() + LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
  );

  batch.set(listingRef, {
    seller_id: input.seller_id,
    title: input.title,
    description: input.description,
    brand: input.brand,
    brand_other: input.brand_other,
    category: input.category,
    colour: input.colour,
    size: input.size,
    measurements: null,
    material: input.material,
    // Still a PRD field, no longer on the form. Written as null rather than
    // omitted, so the decision to drop it stays visible in the data.
    fit_note: null,
    condition: input.condition,
    is_replica: input.is_replica,
    asking_price: input.asking_price,
    // The seller types this herself and it is not on the form yet. The AI has
    // never suggested a price and must not start here.
    original_price: null,
    is_negotiable: false,
    city: input.city,
    city_other: null,
    // Never anything else. Only an admin moves a listing to live.
    status: "pending",
    rejection_reason: null,
    view_count: 0,
    contact_count: 0,
    created_at: now,
    expires_at: expires,
  });

  input.photos.forEach((photo) => {
    const photoRef = db.collection(COLLECTIONS.photos).doc();
    batch.set(photoRef, {
      listing_id: listingRef.id,
      url: photo.url,
      position: photo.position,
      is_cover: photo.is_cover,
      quality_flags: photo.quality_flags,
    });
  });

  await batch.commit();
  return listingRef.id;
}
