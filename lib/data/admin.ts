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
  /** "3h ago", already worded. Computed here rather than in the component
   *  because anything derived from the clock renders differently on the server
   *  and again in the browser a moment later, which React treats as a
   *  hydration error. Computing it once, server side, means both halves agree.
   *
   *  It goes stale on a page left open for hours. For a queue that is checked
   *  and acted on that is the right trade, and every approve refreshes it. */
  waiting_label: string;
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

/** How long she has been waiting, worded. The queue is sorted oldest first, so
 *  this is the number we are judged on: the PRD's target is 24 hours and
 *  silence is what makes sellers give up. */
function waitingLabel(ms: number): string {
  if (!ms) return "just now";
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
        waiting_label: waitingLabel(toMillis(listing.created_at)),
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

/** One row in the accounts list: who signed up, and the number we have to
 *  check by hand before her listings can be trusted. */
export type AccountItem = {
  id: string;
  display_name: string;
  email: string | null;
  /** E.164, or null for a buyer. Buyers are never asked for a number. */
  phone: string | null;
  phone_verified: boolean;
  city: string | null;
  created_at_ms: number;
  joined_label: string;
  /** What she has posted. A seller with listings and an unchecked number is
   *  the one to look at first. */
  listing_count: number;
};

/** Everyone who has made an account, newest first.
 *
 *  Ordered by created_at alone, with no status filter, so it needs no
 *  composite index. Filtering happens below, in memory, which at soft-launch
 *  size is cheaper than another index to deploy.
 *
 *  Admins are left out: we are not verifying ourselves.
 *
 *  MANUAL FOR NOW. Checking a number means opening its WhatsApp link and
 *  seeing a real account at the other end. Once the WhatsApp Business account
 *  with Meta is approved we can send the check automatically and record the
 *  reply, and this list becomes a list of answers rather than a list of jobs.
 *  Until then every row here is a person one of us has to message. */
export async function recentAccounts(max = 100): Promise<AccountItem[]> {
  const db = adminDb();
  const snap = await db
    .collection(COLLECTIONS.users)
    .orderBy("created_at", "desc")
    .limit(max)
    .get();

  const rows = await Promise.all(
    snap.docs
      .filter((doc) => doc.get("is_admin") !== true)
      .map(async (doc) => {
        const countSnap = await db
          .collection(COLLECTIONS.listings)
          .where("seller_id", "==", doc.id)
          .count()
          .get();

        const createdAtMs = toMillis(doc.get("created_at"));
        return {
          id: doc.id,
          display_name: doc.get("display_name") ?? "Unknown",
          email: doc.get("email") ?? null,
          phone: doc.get("phone") ?? null,
          phone_verified: Boolean(doc.get("phone_verified_at")),
          city: doc.get("city") ?? null,
          created_at_ms: createdAtMs,
          joined_label: waitingLabel(createdAtMs),
          listing_count: countSnap.data().count,
        } satisfies AccountItem;
      }),
  );

  // The ones that need doing, first: a number we have not checked yet. Then
  // everyone else, newest first. A buyer with no number needs nothing from us
  // and sits at the bottom.
  return rows.sort((a, b) => {
    const aWaiting = a.phone !== null && !a.phone_verified;
    const bWaiting = b.phone !== null && !b.phone_verified;
    if (aWaiting !== bWaiting) return aWaiting ? -1 : 1;
    return b.created_at_ms - a.created_at_ms;
  });
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
