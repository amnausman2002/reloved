// The waitlist for the smoke test (30 Oct to 10 Nov). Server side only.
//
// Not one of the PRD's six entities: it lives beside them and touches none of
// them. No rules change was needed, because the catch-all at the bottom of
// firestore.rules already denies every browser read and write to a collection
// it does not name. Only this file, through the Admin SDK, can reach it.

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export const WAITLIST_COLLECTION = "waitlist";

export type WaitlistIntent = "buy" | "sell" | "both";

export type WaitlistInput = {
  /** Already trimmed and lowercased. */
  email: string;
  /** E.164, or null when she left it blank. */
  phone: string | null;
  /** Null when she skipped "I'm here to": only the email is required. */
  intent: WaitlistIntent | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  /** Which ad or post she came from, when the link says. */
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
};

/** One document per email, so signing up twice can never make two rows.
 *  Hashed because an email can legally contain "/", which a document id
 *  cannot. */
function docIdFor(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

/** Creates her entry, or updates it if this email is already on the list.
 *
 *  On a repeat signup her answers (intent and phone, when she gave them) are
 *  updated, but where she first came from is kept: utm_*, referrer and
 *  created_at describe the first visit, which is what the smoke test is
 *  measuring. A blank answer never wipes one she gave before. */
export async function upsertWaitlistEntry(input: WaitlistInput): Promise<void> {
  const db = adminDb();
  const ref = db.collection(WAITLIST_COLLECTION).doc(docIdFor(input.email));

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      tx.update(ref, {
        ...(input.intent ? { intent: input.intent } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        updated_at: FieldValue.serverTimestamp(),
      });
      return;
    }
    tx.set(ref, {
      ...input,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });
}
