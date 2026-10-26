// Reading one listing, for the item page. Server side only.
//
// Separate from listings.ts, which is the submit write, and from seller.ts,
// which is a seller reading her own. This is the one both a buyer and a seller
// hit, and it is the only read with a permission rule of its own.
//
// The rule mirrors firestore.rules exactly:
//   allow read: if status == 'live' || isSelf(seller_id) || isAdmin()
// It has to be repeated here because the Admin SDK ignores those rules. Letting
// them drift apart would mean a listing readable through our route that
// Firestore itself would refuse.

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "./types";
import type { ListingStatus, RejectionReason } from "./types";
import type { Brand, Category, City, ConditionValue, Material, Size } from "@/lib/constants";
import type { SubmitPhoto } from "./listings";

/** One listing, shaped the way the item page already reads the sample data, so
 *  that page can render either without caring which it has. */
export type ListingDetail = {
  id: string;
  title: string;
  description: string;
  brand: Brand;
  brandOther?: string;
  category: Category;
  size: Size | null;
  material: Material | null;
  condition: ConditionValue;
  isReplica: boolean;
  askingPrice: number;
  originalPrice: number | null;
  isNegotiable: boolean;
  city: City;
  status: ListingStatus;
  /** Only ever set on a rejected listing, and only her own edit screen reads
   *  it so far. Buyers never see this. */
  rejection_reason: RejectionReason | null;
  photos: Array<{ url: string; isCover: boolean }>;
  createdAt: string;
  seller: {
    id: string;
    displayName: string;
    city: City | null;
    bio: string | null;
    createdAt: string;
    /** Counted from her listings at sold, never stored, per the PRD. */
    soldCount: number;
    /** Whether she can be reached at all, which is all this page needs to know
     *  to decide whether to draw the button.
     *
     *  The number itself is deliberately absent. It is handed out by
     *  POST /api/listings/[id]/contact and nowhere else, one tap at a time,
     *  recorded and capped. Sending it with the listing made every live
     *  listing's number readable by anyone who opened the page. */
    hasPhone: boolean;
  };
  /** Her other live listings, for "More from this seller". Live only, whoever
   *  is looking: her own pending ones are not for a buyer to see, and she has
   *  her profile for those. */
  sellerOtherLive: Array<{
    id: string;
    title: string;
    brand: Brand;
    brandOther?: string;
    category: Category;
    askingPrice: number;
    coverPhoto: string;
  }>;
};

function toIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date().toISOString();
}

async function coverFor(listingId: string): Promise<string> {
  const snap = await adminDb()
    .collection(COLLECTIONS.photos)
    .where("listing_id", "==", listingId)
    .get();
  const photos = snap.docs
    .map((photo) => ({
      url: photo.get("url") as string,
      isCover: photo.get("is_cover") === true,
      position: (photo.get("position") as number) ?? 0,
    }))
    .sort((a, b) => a.position - b.position);
  return (photos.find((photo) => photo.isCover) ?? photos[0])?.url ?? "";
}

export type ViewerResult =
  | { ok: true; listing: ListingDetail }
  | { ok: false; reason: "not_found" | "not_allowed" };

/** One listing, if this viewer is allowed to see it.
 *
 *  "Not allowed" is answered as not found by the route above it, so that a
 *  pending or rejected listing cannot be confirmed to exist by anyone who
 *  should not see it. */
export async function getListingForViewer(
  id: string,
  viewer: { uid: string | null; isAdmin: boolean },
): Promise<ViewerResult> {
  const db = adminDb();
  const doc = await db.collection(COLLECTIONS.listings).doc(id).get();
  if (!doc.exists) return { ok: false, reason: "not_found" };

  const data = doc.data() ?? {};
  const sellerId = data.seller_id as string;
  const status = (data.status as ListingStatus) ?? "pending";

  const allowed = status === "live" || viewer.isAdmin || (viewer.uid !== null && viewer.uid === sellerId);
  if (!allowed) return { ok: false, reason: "not_allowed" };

  const [photoSnap, sellerSnap, soldSnap, otherSnap] = await Promise.all([
    db.collection(COLLECTIONS.photos).where("listing_id", "==", id).get(),
    db.collection(COLLECTIONS.users).doc(sellerId).get(),
    db
      .collection(COLLECTIONS.listings)
      .where("seller_id", "==", sellerId)
      .where("status", "==", "sold")
      .count()
      .get(),
    db
      .collection(COLLECTIONS.listings)
      .where("seller_id", "==", sellerId)
      .where("status", "==", "live")
      .limit(9)
      .get(),
  ]);

  const photos = photoSnap.docs
    .map((photo) => ({
      url: photo.get("url") as string,
      isCover: photo.get("is_cover") === true,
      position: (photo.get("position") as number) ?? 0,
    }))
    .sort((a, b) => a.position - b.position)
    .map(({ url, isCover }) => ({ url, isCover }));

  const sellerOtherLive = await Promise.all(
    otherSnap.docs
      .filter((other) => other.id !== id)
      .slice(0, 8)
      .map(async (other) => ({
        id: other.id,
        title: (other.get("title") as string) ?? "",
        brand: (other.get("brand") as Brand) ?? "unknown",
        brandOther: (other.get("brand_other") as string) ?? undefined,
        category: other.get("category") as Category,
        askingPrice: (other.get("asking_price") as number) ?? 0,
        coverPhoto: await coverFor(other.id),
      })),
  );

  return {
    ok: true,
    listing: {
      id: doc.id,
      title: (data.title as string) ?? "",
      description: (data.description as string) ?? "",
      brand: (data.brand as Brand) ?? "unknown",
      brandOther: (data.brand_other as string) ?? undefined,
      category: data.category as Category,
      size: (data.size as Size) ?? null,
      material: (data.material as Material) ?? null,
      condition: data.condition as ConditionValue,
      isReplica: data.is_replica === true,
      askingPrice: (data.asking_price as number) ?? 0,
      originalPrice: (data.original_price as number) ?? null,
      isNegotiable: data.is_negotiable === true,
      city: data.city as City,
      status,
      rejection_reason: (data.rejection_reason as RejectionReason) ?? null,
      photos,
      createdAt: toIso(data.created_at),
      seller: {
        id: sellerId,
        displayName: sellerSnap.get("display_name") ?? "Seller",
        city: (sellerSnap.get("city") as City) ?? null,
        bio: sellerSnap.get("bio") ?? null,
        createdAt: toIso(sellerSnap.get("created_at")),
        soldCount: soldSnap.data().count,
        hasPhone: Boolean(sellerSnap.get("phone")),
      },
      sellerOtherLive,
    },
  };
}

// ─── Edits ──────────────────────────────────────────────────────────────────
//
// The seller edits her own listings here. firestore.rules denies every client
// write to /listings and /photos, so the browser cannot bypass this.
//
// Two shapes, driven by the listing's current status:
//
//   live       Add photos, lower the price, change the description. Everything
//              else is locked. Status stays live.
//   rejected   Everything open. Status moves back to pending so we review it
//              again, and the old rejection_reason is cleared.
//
// Any other status is refused. There is no edit for pending (we are already
// looking at it), sold, expired or hidden.
//
// No ModerationAction is written. The PRD's log is for four events (approved,
// rejected, hidden, restored), and a seller editing her own listing is not one
// of them.

export type LiveEditPatch = {
  kind: "live";
  description: string;
  /** Whole rupees. Enforced ≤ current price, both here and on the client. */
  askingPrice: number;
  /** New photos she added in this edit, already uploaded to Storage. The
   *  existing ones are left in place: no deletes, no reorder, no cover change. */
  appendedPhotos: Array<{ url: string }>;
};

export type RejectedEditPatch = {
  kind: "rejected";
  title: string;
  description: string;
  brand: Brand;
  brandOther: string | null;
  category: Category;
  size: Size | null;
  material: Material | null;
  condition: ConditionValue;
  isReplica: boolean;
  askingPrice: number;
  city: City;
  /** The whole desired list after the edit. Existing docs that aren't in here
   *  are deleted, new URLs become new docs. One source of truth, same as the
   *  create flow. */
  photos: SubmitPhoto[];
};

export type EditPatch = LiveEditPatch | RejectedEditPatch;

export type EditResult =
  | { ok: true }
  | {
      ok: false;
      /** not_found covers "someone else's listing" too, so a probe cannot tell
       *  one from the other. wrong_status covers pending/sold/expired/hidden.
       *  price_higher is the one live-mode rule the server also enforces,
       *  because the form can be bypassed. */
      reason: "not_found" | "wrong_status" | "price_higher" | "invalid";
    };

/** The read side of an edit: did we approve the current status, and what
 *  shape does the form take? Called by both the route (to decide what to
 *  accept) and the page (to decide what to draw).
 *
 *  Lives on the server because `fetchListing` already answers the question for
 *  the browser via the listing status it returns. */
function editableFor(status: ListingStatus): "live" | "rejected" | null {
  if (status === "live") return "live";
  if (status === "rejected") return "rejected";
  return null;
}

export async function updateListingAs(
  uid: string,
  listingId: string,
  patch: EditPatch,
): Promise<EditResult> {
  const db = adminDb();
  const listingRef = db.collection(COLLECTIONS.listings).doc(listingId);
  const current = await listingRef.get();

  if (!current.exists) return { ok: false, reason: "not_found" };
  // "Not yours" is the same answer as "not found", so a signed-in seller
  // cannot probe other sellers' listing ids and learn which exist.
  if (current.get("seller_id") !== uid) return { ok: false, reason: "not_found" };

  const status = (current.get("status") as ListingStatus) ?? "pending";
  const editable = editableFor(status);
  if (!editable) return { ok: false, reason: "wrong_status" };

  // A browser that sends the wrong kind of patch for the current status is
  // refused rather than mapped into something it did not ask for. This also
  // means a race (she opens edit on a live listing, we move it to sold, she
  // taps Save) is answered as "wrong status" rather than silently applying.
  if (editable !== patch.kind) return { ok: false, reason: "wrong_status" };

  const batch = db.batch();

  if (patch.kind === "live") {
    const currentPrice = (current.get("asking_price") as number) ?? 0;
    if (patch.askingPrice > currentPrice) {
      return { ok: false, reason: "price_higher" };
    }

    batch.update(listingRef, {
      description: patch.description,
      asking_price: patch.askingPrice,
    });

    // Appends: existing photos are left alone, so no need to touch their docs
    // or their positions. New ones go on the end, after whatever was already
    // there. Cover is never changed on a live edit, so is_cover is false for
    // every new photo here.
    if (patch.appendedPhotos.length > 0) {
      const photoSnap = await db
        .collection(COLLECTIONS.photos)
        .where("listing_id", "==", listingId)
        .get();
      const nextPosition =
        photoSnap.docs.reduce(
          (max, doc) => Math.max(max, (doc.get("position") as number) ?? 0),
          -1,
        ) + 1;

      patch.appendedPhotos.forEach((photo, offset) => {
        const photoRef = db.collection(COLLECTIONS.photos).doc();
        batch.set(photoRef, {
          listing_id: listingId,
          url: photo.url,
          position: nextPosition + offset,
          is_cover: false,
          quality_flags: null,
        });
      });
    }

    await batch.commit();
    return { ok: true };
  }

  // Rejected: full replacement of listing fields and photo docs. Status moves
  // back to pending so we review it, and the old reason is cleared so a
  // listing approved on the second try does not carry its first reason into
  // being live.
  batch.update(listingRef, {
    title: patch.title,
    description: patch.description,
    brand: patch.brand,
    brand_other: patch.brandOther,
    category: patch.category,
    size: patch.size,
    material: patch.material,
    condition: patch.condition,
    is_replica: patch.isReplica,
    asking_price: patch.askingPrice,
    city: patch.city,
    status: "pending",
    rejection_reason: null,
  });

  // Replace the photo docs. The images themselves live in Cloud Storage, and
  // storage.rules forbids deleting them from the browser, so files she
  // "removed" are left orphaned. Acceptable at prototype scale and flagged
  // for a later cleanup job.
  const existingPhotos = await db
    .collection(COLLECTIONS.photos)
    .where("listing_id", "==", listingId)
    .get();
  const existingUrls = new Set(existingPhotos.docs.map((doc) => doc.get("url") as string));
  const nextUrls = new Set(patch.photos.map((photo) => photo.url));

  existingPhotos.docs.forEach((doc) => {
    if (!nextUrls.has(doc.get("url") as string)) {
      batch.delete(doc.ref);
    }
  });

  patch.photos.forEach((photo) => {
    if (existingUrls.has(photo.url)) {
      // Already in Firestore: update position/is_cover rather than create a
      // duplicate. The existing doc may have been pointing at a different
      // position before the reorder.
      const existing = existingPhotos.docs.find((doc) => doc.get("url") === photo.url);
      if (existing) {
        batch.update(existing.ref, {
          position: photo.position,
          is_cover: photo.is_cover,
        });
      }
      return;
    }
    const photoRef = db.collection(COLLECTIONS.photos).doc();
    batch.set(photoRef, {
      listing_id: listingId,
      url: photo.url,
      position: photo.position,
      is_cover: photo.is_cover,
      quality_flags: photo.quality_flags,
    });
  });

  await batch.commit();
  return { ok: true };
}
