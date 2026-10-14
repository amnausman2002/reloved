// What happens when a buyer taps Message seller. Server side only.
//
// This is the week 3 success metric, so it is a record and not a counter: one
// ContactEvent row per tap, exactly as the PRD asks. The count on the listing
// is kept alongside it only so the seller's own profile can show "3 contacts"
// without reading the whole collection.
//
// It is also the gate on the seller's phone number. The number is not sent
// with the listing any more: it is handed back by this call and no other, so
// a number cannot be collected by opening item pages. That costs one round
// trip on the tap and is the difference between a marketplace and a phone
// book.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, MAX_CONTACTS_PER_DAY } from "./types";

export type ContactResult =
  | { ok: true; phone: string }
  | { ok: false; reason: "not_found" | "no_phone" | "rate_limited" | "own_listing" };

/** Midnight this morning, in Pakistan.
 *
 *  The cap is "per day" and every buyer and seller is in one country, so the
 *  day that matters is hers, not UTC's. PKT is UTC+5 all year: Pakistan has no
 *  daylight saving, which is the only reason a fixed offset is safe here. */
function startOfDayPkt(): Timestamp {
  const offsetMs = 5 * 60 * 60 * 1000;
  const nowPkt = new Date(Date.now() + offsetMs);
  const midnightPkt = Date.UTC(
    nowPkt.getUTCFullYear(),
    nowPkt.getUTCMonth(),
    nowPkt.getUTCDate(),
  );
  return Timestamp.fromMillis(midnightPkt - offsetMs);
}

/** Records the tap and returns the number to open WhatsApp on.
 *
 *  Live listings only. A pending or rejected listing has no business handing
 *  out a number, and a sold one is not for sale.
 *
 *  The cap is 10 a day per buyer across all listings, which is what the PRD
 *  specifies. It is counted here rather than in firestore.rules because rules
 *  cannot count documents. */
export async function recordContact(
  buyerId: string,
  listingId: string,
): Promise<ContactResult> {
  const db = adminDb();
  const listingRef = db.collection(COLLECTIONS.listings).doc(listingId);
  const listing = await listingRef.get();

  if (!listing.exists || listing.get("status") !== "live") {
    return { ok: false, reason: "not_found" };
  }

  const sellerId = listing.get("seller_id") as string;
  // Her own listing. Nothing to record, and no point opening a chat with
  // herself: the page gives her the normal link back.
  if (sellerId === buyerId) return { ok: false, reason: "own_listing" };

  const seller = await db.collection(COLLECTIONS.users).doc(sellerId).get();
  const phone = (seller.get("phone") as string) ?? null;
  if (!phone) return { ok: false, reason: "no_phone" };

  // How many sellers she has messaged since midnight.
  //
  // This needs the composite index in firestore.indexes.json. If that index is
  // missing or still building, the query throws, and the choice is between
  // blocking every buyer in the country and letting a few through uncapped.
  // The cap is spam protection, not correctness, and Message seller is the one
  // thing this product exists to do, so it fails open and says so loudly.
  //
  // Anything in this log means: deploy the indexes.
  let todayCount = 0;
  try {
    const todaySnap = await db
      .collection(COLLECTIONS.contactEvents)
      .where("buyer_id", "==", buyerId)
      .where("created_at", ">=", startOfDayPkt())
      .count()
      .get();
    todayCount = todaySnap.data().count;
  } catch (error) {
    console.error(
      "CONTACT CAP NOT ENFORCED: the contact_events index is missing. " +
        "Run: firebase deploy --only firestore:indexes",
      error,
    );
  }

  if (todayCount >= MAX_CONTACTS_PER_DAY) {
    return { ok: false, reason: "rate_limited" };
  }

  // The row and the count together, so the number a seller sees on her profile
  // can never drift from the number of rows behind it.
  const batch = db.batch();
  batch.set(db.collection(COLLECTIONS.contactEvents).doc(), {
    listing_id: listingId,
    buyer_id: buyerId,
    created_at: FieldValue.serverTimestamp(),
  });
  batch.update(listingRef, { contact_count: FieldValue.increment(1) });
  await batch.commit();

  return { ok: true, phone };
}
