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
import type { ListingStatus } from "./types";
import type { Brand, Category, City, ConditionValue, Material, Size } from "@/lib/constants";

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
