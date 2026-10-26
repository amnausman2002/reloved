// The six entities from the PRD's domain model, as TypeScript.
//
// Written before any read or write exists, so the sell flow and the admin
// queue agree on field names before either touches the database. The PRD is
// the source of truth: do not add, rename or remove a field here without
// changing it there first.
//
// Field names are snake_case to match the PRD tables exactly, even though the
// rest of the codebase is camelCase. These names end up as Firestore document
// keys and will outlive any refactor, so matching the spec is worth more than
// matching the local style.
//
// Dates are Firestore Timestamps, not JS Dates. Converting at the edge rather
// than storing numbers keeps Firestore's own date queries usable.

import type { Timestamp } from "firebase/firestore";
import type {
  Brand,
  Category,
  City,
  ConditionValue,
  Material,
  Size,
} from "@/lib/constants";

/** Collection names in one place, so a typo is a type error and not an empty
 *  result set at midnight before the deadline. */
export const COLLECTIONS = {
  users: "users",
  listings: "listings",
  photos: "photos",
  contactEvents: "contact_events",
  moderationActions: "moderation_actions",
  reports: "reports",
} as const;

export type ListingStatus = "pending" | "live" | "rejected" | "sold" | "expired" | "hidden";

export type RejectionReason =
  | "bad_photos"
  | "missing_details"
  | "not_allowed"
  | "suspected_counterfeit";

export type ReportReason = "counterfeit" | "not_as_described" | "inappropriate" | "spam";

export type ModerationActionType = "approved" | "rejected" | "hidden" | "restored";

/** One record per email address. Buyers, sellers and admins are the same
 *  entity: the difference is what they have done, not a role field. A seller
 *  is a user with a verified phone and at least one listing. */
export type User = {
  id: string;
  email: string;
  email_verified_at: Timestamp | null;
  /** E.164, for example +923001234567. Sellers only, never asked of a buyer. */
  phone: string | null;
  /** CHANGED: set by an admin, not by an SMS code. Amna and Bismah verify
   *  numbers by hand from the queue for now, by tapping the WhatsApp link
   *  before approving. The OTP screens are built but paused. */
  phone_verified_at: Timestamp | null;
  /** First name only. The one thing about her a buyer sees. */
  display_name: string;
  city: City | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: Timestamp;
};

/** The core entity. Status drives everything the buyer, the seller and the
 *  admin see.
 *
 *  Sold count is deliberately absent: it is counted from this seller's
 *  listings at status "sold", never stored. */
export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  /** Her own words. Flaws live in here too: flaw_note was merged into this
   *  field on 8 Oct. */
  description: string;
  brand: Brand;
  /** Only when brand is "other". */
  brand_other: string | null;
  category: Category;
  /** Plain everyday words, filled by photo-to-listing and used by search.
   *  Captured but not editable by the seller: there is no colour field on the
   *  form and no fixed list yet. */
  colour: string | null;
  /** Null for dupattas, which have no size at all. */
  size: Size | null;
  measurements: string | null;
  /** Not in the PRD's Listing table as agreed yet. Needs Bismah, because
   *  buyers will filter on it. */
  material: Material | null;
  /** Still specified in the PRD but no longer on the sell form. Kept so the
   *  decision to delete it is made deliberately rather than by omission. */
  fit_note: string | null;
  condition: ConditionValue;
  /** A required declaration, never inferred from the photos. */
  is_replica: boolean;
  /** Whole rupees. */
  asking_price: number;
  original_price: number | null;
  is_negotiable: boolean;
  city: City;
  /** Not built yet: needs a PRD change first, because buyers see the city. */
  city_other: string | null;
  status: ListingStatus;
  rejection_reason: RejectionReason | null;
  /** Seller and admin only. Never shown to a buyer. */
  view_count: number;
  contact_count: number;
  /** Drives newest-first ordering on browse. */
  created_at: Timestamp;
  /** created_at plus 30 days. */
  expires_at: Timestamp;
};

/** What the photo quality check found, per photo. Advisory only: these never
 *  block a submission and are never shown to a buyer. */
export type PhotoQualityFlags = {
  blurry: boolean;
  dark: boolean;
  busy_background: boolean;
  blends_into_background: boolean;
  item_cropped: boolean;
  crooked: boolean;
};

/** Two to six per listing, enforced at submit. Exactly one is_cover. */
export type Photo = {
  id: string;
  listing_id: string;
  url: string;
  /** Display order. The cover is moved to the front when she picks it. */
  position: number;
  is_cover: boolean;
  quality_flags: PhotoQualityFlags | null;
};

/** One row per WhatsApp tap by an email-verified buyer. The week 3 success
 *  metric, so it is a record and not a counter. Maximum 10 per buyer per day,
 *  enforced on the server. */
export type ContactEvent = {
  id: string;
  listing_id: string;
  buyer_id: string;
  created_at: Timestamp;
};

/** Append-only. Written for exactly four events. Marking an item sold or a
 *  listing expiring is not moderation and writes no row here. */
export type ModerationAction = {
  id: string;
  listing_id: string;
  /** Null when the system acted: a second unresolved report auto-hides a
   *  listing, and no admin was involved. */
  admin_id: string | null;
  action: ModerationActionType;
  reason: RejectionReason | null;
  /** Set when this action resolves a report. */
  report_id: string | null;
  created_at: Timestamp;
};

/** Two unresolved reports auto-hide the listing. The reporter is told the
 *  outcome either way. */
export type Report = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: ReportReason;
  detail: string | null;
  resolved_at: Timestamp | null;
  created_at: Timestamp;
};

/** How many unresolved reports hide a listing automatically. */
export const AUTO_HIDE_REPORT_COUNT = 2;

/** How many WhatsApp taps one buyer gets per day. */
export const MAX_CONTACTS_PER_DAY = 10;

/** How long a listing lives before it expires. */
export const LISTING_LIFETIME_DAYS = 30;
