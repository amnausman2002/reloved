// Everything the admin queue reads and writes. Server side only.
//
// Path 2 in the PRD: we open the queue, see everything pending oldest first,
// check the seller's other listings beside each one as the duplicate check,
// tap the WhatsApp button ourselves, then approve or reject with a reason.
//
// Nothing here checks permissions. The caller does that with isAdmin() before
// it gets this far, because the Admin SDK ignores firestore.rules entirely.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "./types";
import type { ListingStatus, ModerationActionType, RejectionReason } from "./types";

/** One row in the queue: the listing, its cover, the seller, and her other
 *  live listings. Everything the row needs, fetched once. */
export type QueueItem = {
  id: string;
  title: string;
  brand: string;
  brand_other: string | null;
  category: string;
  size: string | null;
  condition: string;
  description: string;
  asking_price: number;
  city: string;
  is_replica: boolean;
  created_at_ms: number;
  photos: Array<{ url: string; is_cover: boolean; position: number }>;
  seller: {
    id: string;
    display_name: string;
    city: string | null;
    /** E.164. Only ever shown to us, never to a buyer. */
    phone: string | null;
    phone_verified: boolean;
    /** Counted from her listings at status sold. Never stored. */
    sold_count: number;
  };
  /** Her other listings that are already live. The duplicate check is seeing
   *  them next to this one. */
  other_live: Array<{ id: string; title: string; asking_price: number }>;
};

/** Timestamps cannot cross from a server component into a client component:
 *  Next can only pass plain data. Milliseconds survive the trip. */
function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

/** The queue. Pending only, oldest first, because the oldest submission is the
 *  seller who has been waiting longest and silence is what makes sellers give
 *  up.
 *
 *  Deliberately unpaginated. The PRD expects about 15 listings; a "load more"
 *  button would be more code than the problem deserves. Revisit past a hundred
 *  or so, where the per-row seller lookups below start to add up. */
export async function pendingQueue(max = 50): Promise<QueueItem[]> {
  const db = adminDb();
  const snap = await db
    .collection(COLLECTIONS.listings)
    .where("status", "==", "pending")
    .orderBy("created_at", "asc")
    .limit(max)
    .get();

  return Promise.all(
    snap.docs.map(async (doc) => {
      const listing = doc.data();
      const sellerId: string = listing.seller_id;

      const [photoSnap, sellerSnap, soldSnap, liveSnap] = await Promise.all([
        db.collection(COLLECTIONS.photos).where("listing_id", "==", doc.id).get(),
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
          .limit(5)
          .get(),
      ]);

      const photos = photoSnap.docs
        .map((photo) => ({
          url: photo.get("url") as string,
          is_cover: photo.get("is_cover") === true,
          position: (photo.get("position") as number) ?? 0,
        }))
        .sort((a, b) => a.position - b.position);

      return {
        id: doc.id,
        title: listing.title ?? "",
        brand: listing.brand ?? "unknown",
        brand_other: listing.brand_other ?? null,
        category: listing.category ?? "",
        size: listing.size ?? null,
        condition: listing.condition ?? "",
        description: listing.description ?? "",
        asking_price: listing.asking_price ?? 0,
        city: listing.city ?? "",
        is_replica: listing.is_replica === true,
        created_at_ms: toMillis(listing.created_at),
        photos,
        seller: {
          id: sellerId,
          display_name: sellerSnap.get("display_name") ?? "Unknown seller",
          city: sellerSnap.get("city") ?? null,
          phone: sellerSnap.get("phone") ?? null,
          phone_verified: Boolean(sellerSnap.get("phone_verified_at")),
          sold_count: soldSnap.data().count,
        },
        other_live: liveSnap.docs.map((other) => ({
          id: other.id,
          title: other.get("title") as string,
          asking_price: (other.get("asking_price") as number) ?? 0,
        })),
      };
    }),
  );
}

export type ModerateInput = {
  listingId: string;
  adminId: string;
  action: ModerationActionType;
  reason: RejectionReason | null;
  reportId?: string | null;
};

/** What each action does to the listing's status. "restored" puts a hidden
 *  listing back to live, which is the only way out of hidden. */
const STATUS_FOR: Record<ModerationActionType, ListingStatus> = {
  approved: "live",
  rejected: "rejected",
  hidden: "hidden",
  restored: "live",
};

/** Changes a listing's status and writes the matching ModerationAction, as one
 *  batch.
 *
 *  Always both. The PRD calls the log append-only and it is the record of why
 *  something happened, so a status that changed without a row would be a hole
 *  in the history with nobody able to say who did it. */
export async function moderate(input: ModerateInput): Promise<void> {
  const db = adminDb();
  const batch = db.batch();

  const listingRef = db.collection(COLLECTIONS.listings).doc(input.listingId);
  batch.update(listingRef, {
    status: STATUS_FOR[input.action],
    // Cleared on approve and on restore, so a listing that was rejected,
    // edited and resubmitted does not carry its old reason into being live.
    rejection_reason: input.action === "rejected" ? input.reason : null,
  });

  const actionRef = db.collection(COLLECTIONS.moderationActions).doc();
  batch.set(actionRef, {
    listing_id: input.listingId,
    admin_id: input.adminId,
    action: input.action,
    reason: input.reason,
    report_id: input.reportId ?? null,
    created_at: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/** Marks a seller's number as checked.
 *
 *  CHANGED 12 Oct: this is how phone_verified_at gets set now. There is no SMS
 *  code; Amna or Bismah taps the WhatsApp link in the queue, sees the number is
 *  real, and says so here. A seller can never write this field herself, which
 *  is what firestore.rules enforces. */
export async function setPhoneVerified(sellerId: string, verified: boolean): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(sellerId)
    .update({ phone_verified_at: verified ? FieldValue.serverTimestamp() : null });
}
