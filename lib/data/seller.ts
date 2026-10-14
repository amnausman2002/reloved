// What a seller reads about herself. Server side only.
//
// This is the first read in the app that is not the admin queue, and it has to
// be a server read for one specific reason: firestore.rules denies the browser
// every read of the photos collection, on purpose, so that nobody can list
// every photo we hold including listings still pending and ones we rejected.
// Her listings she could read herself; their covers she could not. So the whole
// thing is fetched here with the Admin SDK and handed over as one answer.
//
// Nothing here checks permissions. The route does that first, by verifying an
// ID token, because the Admin SDK ignores firestore.rules entirely.

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "./types";
import type { ListingStatus, RejectionReason } from "./types";
import type { Brand, Category, City } from "@/lib/constants";


/** One of her listings, shaped for the profile page.
 *
 *  camelCase and a flat shape, unlike the snake_case documents underneath,
 *  because this is what a component consumes. It deliberately matches the
 *  fields the profile page already reads off the sample data, so one page can
 *  render either without knowing which it has. */
export type MyListing = {
  id: string;
  title: string;
  brand: Brand;
  brandOther?: string;
  category: Category;
  askingPrice: number;
  status: ListingStatus;
  photos: Array<{ url: string; isCover: boolean }>;
  viewCount: number;
  contactCount: number;
  rejectionReason?: RejectionReason;
  /** ISO date. Timestamps cannot cross from the server to a browser. */
  createdAt: string;
};

export type MyProfile = {
  id: string;
  displayName: string;
  city: City | null;
  bio: string | null;
  /** E.164, hers alone. This response is only ever sent to the account it
   *  belongs to, which is what makes including it safe. */
  phone: string | null;
  createdAt: string;
};

export type MySellerData = {
  profile: MyProfile;
  listings: MyListing[];
};

function toIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date().toISOString();
}

/** A seller as a buyer sees her: who she is and what she has for sale.
 *
 *  Email and phone are deliberately absent. This is the public view, so it
 *  carries only the four fields the PRD's profile actually shows, plus the
 *  sold count, which is the one trust signal we have. */
export type PublicSeller = {
  id: string;
  displayName: string;
  city: City | null;
  bio: string | null;
  createdAt: string;
  soldCount: number;
  listings: Array<{
    id: string;
    title: string;
    brand: Brand;
    brandOther?: string;
    category: Category;
    askingPrice: number;
    coverPhoto: string;
  }>;
};

/** Her public profile. Live listings only, whoever is looking.
 *
 *  Her own profile is a different read (mySellerData above): that one needs
 *  every status and her phone number, and answers only for the account that
 *  asked. This one is for everyone else. */
export async function publicSeller(uid: string): Promise<PublicSeller | null> {
  const db = adminDb();

  const [userSnap, liveSnap, soldSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(uid).get(),
    db
      .collection(COLLECTIONS.listings)
      .where("seller_id", "==", uid)
      .where("status", "==", "live")
      .limit(60)
      .get(),
    db
      .collection(COLLECTIONS.listings)
      .where("seller_id", "==", uid)
      .where("status", "==", "sold")
      .count()
      .get(),
  ]);

  if (!userSnap.exists) return null;

  const listings = await Promise.all(
    liveSnap.docs.map(async (doc) => {
      const photoSnap = await db
        .collection(COLLECTIONS.photos)
        .where("listing_id", "==", doc.id)
        .get();
      const photos = photoSnap.docs
        .map((photo) => ({
          url: photo.get("url") as string,
          isCover: photo.get("is_cover") === true,
          position: (photo.get("position") as number) ?? 0,
        }))
        .sort((a, b) => a.position - b.position);

      return {
        id: doc.id,
        title: (doc.get("title") as string) ?? "",
        brand: (doc.get("brand") as Brand) ?? "unknown",
        brandOther: (doc.get("brand_other") as string) ?? undefined,
        category: doc.get("category") as Category,
        askingPrice: (doc.get("asking_price") as number) ?? 0,
        coverPhoto: (photos.find((p) => p.isCover) ?? photos[0])?.url ?? "",
      };
    }),
  );

  return {
    id: uid,
    displayName: userSnap.get("display_name") ?? "Seller",
    city: (userSnap.get("city") as City) ?? null,
    bio: userSnap.get("bio") ?? null,
    createdAt: toIso(userSnap.get("created_at")),
    soldCount: soldSnap.data().count,
    listings,
  };
}

export type MarkSoldResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_yours" | "wrong_status" };

/** The two status changes a seller makes herself, which are each other's
 *  opposite and nothing else.
 *
 *  Ownership and the current status are both checked here rather than trusted
 *  from the browser, because this runs with the Admin SDK and firestore.rules
 *  is not watching.
 *
 *  Only these two moves, in these two directions:
 *
 *    live -> sold   she sold it
 *    sold -> live   she had not, or it fell through
 *
 *  A pending listing cannot jump to sold: it is one we have not approved, and
 *  it would put an item in her sold count that no buyer could ever have seen.
 *  And unsold goes back to live rather than to the queue, because that listing
 *  was approved once already. Sending it round again would make a mistyped tap
 *  cost her another day of waiting, for an item we have seen.
 *
 *  No ModerationAction is written for either. The PRD is explicit that the log
 *  is for four events (approved, rejected, hidden, restored) and that marking
 *  sold is not one of them. The same reasoning covers undoing it. */
async function setSellerStatus(
  uid: string,
  listingId: string,
  from: "live" | "sold",
  to: "live" | "sold",
): Promise<MarkSoldResult> {
  const ref = adminDb().collection(COLLECTIONS.listings).doc(listingId);
  const doc = await ref.get();

  if (!doc.exists) return { ok: false, reason: "not_found" };
  if (doc.get("seller_id") !== uid) return { ok: false, reason: "not_yours" };
  if (doc.get("status") !== from) return { ok: false, reason: "wrong_status" };

  // sold_at is not in the PRD's Listing table, so nothing but the status moves.
  // created_at still orders her listings, and expires_at is untouched: an item
  // that comes back from sold keeps the 30 days it was given when it was
  // posted, rather than quietly earning another month.
  await ref.update({ status: to });
  return { ok: true };
}

/** She has sold it. */
export async function markListingSold(uid: string, listingId: string): Promise<MarkSoldResult> {
  return setSellerStatus(uid, listingId, "live", "sold");
}

/** She had not sold it after all. Back to live, and back into browse. */
export async function markListingUnsold(uid: string, listingId: string): Promise<MarkSoldResult> {
  return setSellerStatus(uid, listingId, "sold", "live");
}

/** Everything her own profile page needs: who she is, and everything she has
 *  listed at any status.
 *
 *  Every status, not just live: the point of her own profile is seeing the
 *  pending one she submitted ten minutes ago. Browse is the place that shows
 *  live only.
 *
 *  Unpaginated, like the admin queue and for the same reason. Revisit when a
 *  seller has more than a screenful. */
export async function mySellerData(uid: string): Promise<MySellerData | null> {
  const db = adminDb();

  const [userSnap, listingSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(uid).get(),
    db
      .collection(COLLECTIONS.listings)
      .where("seller_id", "==", uid)
      .orderBy("created_at", "desc")
      .get(),
  ]);

  // She has an account but no user document. That should not happen, since one
  // is written at sign-up and again at every submit, but a missing document is
  // not a reason to show her an error page.
  if (!userSnap.exists) return null;

  const listings = await Promise.all(
    listingSnap.docs.map(async (doc) => {
      const data = doc.data();
      const photoSnap = await db
        .collection(COLLECTIONS.photos)
        .where("listing_id", "==", doc.id)
        .get();

      const photos = photoSnap.docs
        .map((photo) => ({
          url: photo.get("url") as string,
          isCover: photo.get("is_cover") === true,
          position: (photo.get("position") as number) ?? 0,
        }))
        .sort((a, b) => a.position - b.position)
        .map(({ url, isCover }) => ({ url, isCover }));

      return {
        id: doc.id,
        title: (data.title as string) ?? "",
        brand: (data.brand as Brand) ?? "unknown",
        brandOther: (data.brand_other as string) ?? undefined,
        category: data.category as Category,
        askingPrice: (data.asking_price as number) ?? 0,
        status: (data.status as ListingStatus) ?? "pending",
        photos,
        viewCount: (data.view_count as number) ?? 0,
        contactCount: (data.contact_count as number) ?? 0,
        rejectionReason: (data.rejection_reason as RejectionReason) ?? undefined,
        createdAt: toIso(data.created_at),
      } satisfies MyListing;
    }),
  );

  return {
    profile: {
      id: uid,
      displayName: userSnap.get("display_name") ?? "You",
      city: (userSnap.get("city") as City) ?? null,
      bio: userSnap.get("bio") ?? null,
      phone: userSnap.get("phone") ?? null,
      createdAt: toIso(userSnap.get("created_at")),
    },
    listings,
  };
}
