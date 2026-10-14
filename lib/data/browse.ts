// What browse reads. Server side only.
//
// Live listings, newest first, which is exactly what the PRD says browse shows
// and nothing else. No seller details, no phone, no description: a grid card
// needs a cover, a title, a brand and a price, so that is all this returns.
//
// Server side for the same reason as everything else that touches photos:
// firestore.rules closes the photos collection to the browser, so the cover has
// to be joined on here.

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "./types";
import type { Brand, Category, City, ConditionValue, Size } from "@/lib/constants";

/** One card in the grid. The same fields browse already reads off its sample
 *  array, plus the date, so the two can sit in one list. */
export type BrowseListing = {
  id: string;
  title: string;
  brand: Brand;
  brandOther?: string;
  category: Category;
  size: Size | null;
  condition: ConditionValue;
  askingPrice: number;
  city: City;
  coverPhoto: string;
  /** Milliseconds. Browse sorts newest first and the sample items have no date
   *  at all, so this is what puts a real listing above them. */
  createdAtMs: number;
};

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

/** Everything live, newest first.
 *
 *  Unpaginated, like the admin queue: the PRD expects roughly 15 listings for
 *  the soft launch. The limit is a backstop, not paging, and browse will need
 *  real paging long before it is reached. */
export async function liveListings(max = 60): Promise<BrowseListing[]> {
  const db = adminDb();
  const snap = await db
    .collection(COLLECTIONS.listings)
    .where("status", "==", "live")
    .orderBy("created_at", "desc")
    .limit(max)
    .get();

  if (snap.empty) return [];

  // One photo query per listing. Fine at this size, and the alternative is
  // denormalising the cover onto the listing, which is a data model change and
  // needs the PRD and Bismah.
  return Promise.all(
    snap.docs.map(async (doc) => {
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
        .sort((a, b) => a.position - b.position);

      return {
        id: doc.id,
        title: (data.title as string) ?? "",
        brand: (data.brand as Brand) ?? "unknown",
        brandOther: (data.brand_other as string) ?? undefined,
        category: data.category as Category,
        size: (data.size as Size) ?? null,
        condition: data.condition as ConditionValue,
        askingPrice: (data.asking_price as number) ?? 0,
        city: data.city as City,
        coverPhoto: (photos.find((photo) => photo.isCover) ?? photos[0])?.url ?? "",
        createdAtMs: toMillis(data.created_at),
      } satisfies BrowseListing;
    }),
  );
}
