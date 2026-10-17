// Runs the admin review call (copilot + catalogue check) on real listings and
// prints the notes the queue would show.
//
//   npm run try-review              the newest 5 listings, any status
//   npm run try-review -- <id> ...  specific listings
//
// Read-only: it writes nothing to Firestore.

import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/data/types";
import { runReview } from "@/lib/ai/review";

async function main() {
  const db = adminDb();
  const ids = process.argv.slice(2);
  const docs = ids.length
    ? await Promise.all(ids.map((id) => db.collection(COLLECTIONS.listings).doc(id).get()))
    : (await db.collection(COLLECTIONS.listings).orderBy("created_at", "desc").limit(5).get()).docs;

  for (const doc of docs) {
    const listing = doc.data();
    if (!listing) continue;
    const photoSnap = await db.collection(COLLECTIONS.photos).where("listing_id", "==", doc.id).get();
    const photoUrls = photoSnap.docs
      .map((p) => ({ url: p.get("url") as string, position: (p.get("position") as number) ?? 0 }))
      .sort((a, b) => a.position - b.position)
      .map((p) => p.url);

    console.log(`\n${doc.id} · ${listing.status} · "${listing.title}" · brand ${listing.brand} · ${photoUrls.length} photos`);
    console.log(`  her description: ${listing.description || "(empty)"}`);
    const result = await runReview({
      title: listing.title ?? "",
      brand: listing.brand ?? "unknown",
      brandOther: listing.brand_other ?? null,
      category: listing.category ?? "",
      condition: listing.condition ?? "",
      description: listing.description ?? "",
      isReplica: listing.is_replica === true,
      photoUrls,
    });
    if (!result.ok) {
      console.log(`  FAILED: ${result.error}`);
      continue;
    }
    const { notes } = result;
    console.log(`  photos show: ${notes.photosShow}`);
    console.log(`  brand:       ${notes.brand ? `[${notes.brand.kind}] ${notes.brand.text}` : "(no note: brand unknown)"}`);
    console.log(`  flaws not in description: ${notes.flawsNotMentioned.join("; ") || "none"}`);
    console.log(`  catalogue:   ${notes.catalogue ? `photos ${notes.catalogue.photos.join(", ")}: ${notes.catalogue.reason}` : "no"}`);
    console.log(`  ${result.latencyMs} ms`);
  }
}

main();
