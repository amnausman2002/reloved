// Pakistani brands, then Western/international brands, then the two special values.
// This list lives only here — never copy it into another file.
export const BRANDS = [
  "khaadi",
  "sapphire",
  "generation",
  "lama",
  "elan",
  "gul_ahmed",
  "ideas_by_gul_ahmed",
  "alkaram_studio",
  "limelight",
  "nishat_linen",
  "maria_b",
  "sana_safinaz",
  "outfitters",
  "bonanza_satrangi",
  "beechtree",
  "zellbury",
  "junaid_jamshed",
  "ethnic",
  "cross_stitch",
  "baroque",
  "asim_jofa",
  "crimson",
  "mausummery",
  "agha_noor",
  "faiza_saqlain",
  "breakhouse",
  "zara",
  "hm",
  "mango",
  "levis",
  "nike",
  "adidas",
  "puma",
  "bershka",
  "pull_and_bear",
  "stradivarius",
  "marks_and_spencer",
  "tommy_hilfiger",
  "calvin_klein",
  "forever_21",
  "shein",
  "other",
  "unknown",
] as const;

export type Brand = (typeof BRANDS)[number];

// "unknown" means the seller (or the AI) cannot tell the brand — tags are
// often cut out, so this is a normal choice, never an error. "other" means a
// real brand that isn't on the list, paired with a free-text brand_other value.
//
// Only the values a plain snake_case-to-Title-Case conversion gets wrong need
// an entry here. Everything else ("khaadi" to "Khaadi") is derived.
export const BRAND_LABELS: Partial<Record<Brand, string>> = {
  unknown: "Not sure / no label",
  hm: "H&M",
  levis: "Levi's",
  maria_b: "Maria B.",
  ideas_by_gul_ahmed: "Ideas by Gul Ahmed",
  marks_and_spencer: "Marks & Spencer",
  pull_and_bear: "Pull & Bear",
  forever_21: "Forever 21",
};

/** Display label for a brand: the override above, or Title Case of the value. */
export function brandLabel(brand: Brand): string {
  return BRAND_LABELS[brand] ?? titleCaseValue(brand);
}

/** Display label for a category. Categories have no overrides so far. */
export function categoryLabel(category: Category): string {
  return titleCaseValue(category);
}

/** Display label for a city. CITIES already carries proper labels, because
 *  several are multi-word, so this reads them rather than title-casing: it is
 *  the difference between "Rahim Yar Khan" and "Rahim_yar_khan". */
export function cityLabel(city: string): string {
  return CITIES.find((item) => item.value === city)?.label ?? titleCaseValue(city);
}

function titleCaseValue(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const CATEGORIES = [
  "kurta",
  "pret",
  "co_ord_set",
  "dupatta",
  "dress",
  "top",
  "bottoms",
  "jeans",
  "skirt",
  "jacket",
  "sportswear",
] as const;
// Shoes and bags were in this list until 21 Oct and are moved to the next
// phase. Shoes bring their own size scale (UK 3-9) and bags have none, so
// bringing them back means adding the values here and deciding SIZE_OPTIONS.

export type Category = (typeof CATEGORIES)[number];

export const CONDITION_VALUES = [
  "brand_new_with_tags",
  "brand_new_without_tags",
  "very_good",
  "fair",
] as const;

export type ConditionValue = (typeof CONDITION_VALUES)[number];

export const CONDITIONS: { value: ConditionValue; label: string; description: string }[] = [
  { value: "brand_new_with_tags", label: "Brand new with tags", description: "With tags, never worn" },
  { value: "brand_new_without_tags", label: "Brand new without tags", description: "No tags, never worn" },
  { value: "very_good", label: "Very good", description: "Well worn, but still in great shape" },
  // Bismah's wording wins: it keeps the instruction that was dropped when the
  // em dash was removed, and loses the dash. That clears the one known em-dash
  // exception CLAUDE.md records in this file.
  { value: "fair", label: "Fair", description: "Shows some signs of wear. Please photograph the areas that show it." },
];

// Photos per listing, enforced at submit, with exactly one cover.
// Deliberately NOT the same as MIN_PHOTOS/MAX_PHOTOS in lib/ai/images.ts: the
// AI call accepts a single photo so it can read early while she is still
// adding more. A finished listing needs two. Different rules, both correct.
export const MIN_LISTING_PHOTOS = 2;
export const MAX_LISTING_PHOTOS = 6;

// Photos in one bulk batch ("Many items"). Any more and we keep the first 30.
export const MAX_BATCH_PHOTOS = 30;

// Listing status. Only admins set `live` and `rejected`. Browse shows `live`
// only, newest first.
export const LISTING_STATUSES = [
  "pending",
  "live",
  "rejected",
  "sold",
  "expired",
  "hidden",
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  pending: "Pending",
  live: "Live",
  rejected: "Rejected",
  sold: "Sold",
  expired: "Expired",
  hidden: "Hidden",
};

// Canned reasons an admin picks when rejecting a pending listing. The same
// list is reused as ModerationAction's `reason`.
//
// MERGED 13 Oct: Amna and Bismah built this independently and at the same
// time, with the same name and different shapes. Bismah's is the one kept,
// because the seller profile already reads REJECTION_REASON_LABELS to tell an
// owner why her listing was rejected, and that code is pushed and shared.
// Amna's seller-facing wording survives as REJECTION_REASON_MESSAGES below:
// a label names the reason for us, a message is what the seller is told.
export const REJECTION_REASONS = [
  "bad_photos",
  "missing_details",
  "not_allowed",
  "suspected_counterfeit",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** How a reason reads to us: the chip in the admin queue, and the line on a
 *  seller's own listing telling her what happened. */
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  bad_photos: "Photos need work",
  missing_details: "Missing details",
  not_allowed: "Not an allowed item",
  suspected_counterfeit: "Suspected counterfeit",
};

/** What the seller is actually told, and the draft for the rejection email.
 *  A label names the problem; this says what to do about it and when she will
 *  hear back, which is the tone design-system.md asks for. The first two are
 *  lifted from its copy samples unchanged.
 *
 *  Shown in the rejection modal before sending, so we see the message rather
 *  than compose one each time. */
export const REJECTION_REASON_MESSAGES: Record<RejectionReason, string> = {
  bad_photos:
    "We couldn't see the item clearly enough. Try retaking your photos in natural light and resubmit. We'll review it again within 24 hours!",
  missing_details:
    "Almost there! A few details are missing. Fill those in and resubmit, and we'll take another look within 24 hours.",
  not_allowed:
    "This one isn't something we can list on Reloved. Have a look at what we accept, and do send us anything else you're clearing out!",
  suspected_counterfeit:
    "We couldn't confirm this is the brand on the listing. If you have a label or tag, add a close-up photo of it and resubmit.",
};

// Clothes XS-XL. Dupattas have no size at all.
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export type Size = (typeof CLOTHING_SIZES)[number];

// Which size list each category uses. null means the category shows no size
// field. Typed as a full Record<Category, ...> on purpose: adding a category to
// CATEGORIES without deciding its sizes then fails the type check.
export const SIZE_OPTIONS: Record<Category, readonly Size[] | null> = {
  kurta: CLOTHING_SIZES,
  pret: CLOTHING_SIZES,
  co_ord_set: CLOTHING_SIZES,
  dupatta: null, // A dupatta is a scarf. There is no XS to XL for it.
  dress: CLOTHING_SIZES,
  top: CLOTHING_SIZES,
  bottoms: CLOTHING_SIZES,
  jeans: CLOTHING_SIZES,
  skirt: CLOTHING_SIZES,
  jacket: CLOTHING_SIZES,
  sportswear: CLOTHING_SIZES,
};

// Major Pakistani cities, roughly largest first so the likeliest answers sit at
// the top of the dropdown. Covers all four provincial capitals, Islamabad, and
// the Azad Kashmir and Gilgit-Baltistan centres.
//
// "other" is last and means a town that is not on this list — the north star is
// a woman *anywhere* in Pakistan, so the list must never be a dead end. It
// needs a free-text companion field to be useful, the same way brand "other"
// pairs with brand_other. That field does not exist yet: see the TODO below.
export const CITIES = [
  { value: "karachi", label: "Karachi" },
  { value: "lahore", label: "Lahore" },
  { value: "faisalabad", label: "Faisalabad" },
  { value: "rawalpindi", label: "Rawalpindi" },
  { value: "islamabad", label: "Islamabad" },
  { value: "gujranwala", label: "Gujranwala" },
  { value: "peshawar", label: "Peshawar" },
  { value: "multan", label: "Multan" },
  { value: "hyderabad", label: "Hyderabad" },
  { value: "quetta", label: "Quetta" },
  { value: "bahawalpur", label: "Bahawalpur" },
  { value: "sargodha", label: "Sargodha" },
  { value: "sialkot", label: "Sialkot" },
  { value: "sukkur", label: "Sukkur" },
  { value: "larkana", label: "Larkana" },
  { value: "sheikhupura", label: "Sheikhupura" },
  { value: "rahim_yar_khan", label: "Rahim Yar Khan" },
  { value: "jhang", label: "Jhang" },
  { value: "dera_ghazi_khan", label: "Dera Ghazi Khan" },
  { value: "gujrat", label: "Gujrat" },
  { value: "sahiwal", label: "Sahiwal" },
  { value: "wah_cantonment", label: "Wah Cantonment" },
  { value: "mardan", label: "Mardan" },
  { value: "kasur", label: "Kasur" },
  { value: "okara", label: "Okara" },
  { value: "mingora", label: "Mingora" },
  { value: "nawabshah", label: "Nawabshah" },
  { value: "chiniot", label: "Chiniot" },
  { value: "abbottabad", label: "Abbottabad" },
  { value: "mirpur_khas", label: "Mirpur Khas" },
  { value: "muzaffarabad", label: "Muzaffarabad" },
  { value: "mirpur", label: "Mirpur" },
  { value: "gilgit", label: "Gilgit" },
  { value: "other", label: "Other" },
] as const;

export type City = (typeof CITIES)[number]["value"];

// TODO: city "other" needs a `city_other` free-text field on Listing, mirroring
// brand_other. Adding it changes the domain model, so it needs a PRD update and
// Bismah's agreement first (buyers see the city on browse and item detail).

// Fabrics, roughly most common first for Pakistani women's clothing, then the
// western staples. Buyers shop by fabric here as much as by brand: "lawn" and
// "khaddar" are seasons, not just materials.
//
// NEW FIELD. `material` is not in the PRD's Listing table yet, so this needs a
// PRD update and Bismah's agreement before it is relied on anywhere. It is
// optional on the form in the meantime.
export const MATERIALS = [
  { value: "lawn", label: "Lawn" },
  { value: "cotton", label: "Cotton" },
  { value: "linen", label: "Linen" },
  { value: "khaddar", label: "Khaddar" },
  { value: "karandi", label: "Karandi" },
  { value: "chiffon", label: "Chiffon" },
  { value: "georgette", label: "Georgette" },
  { value: "organza", label: "Organza" },
  { value: "silk", label: "Silk" },
  { value: "crepe", label: "Crepe" },
  { value: "velvet", label: "Velvet" },
  { value: "net", label: "Net" },
  { value: "jacquard", label: "Jacquard" },
  { value: "viscose", label: "Viscose" },
  { value: "polyester", label: "Polyester" },
  { value: "denim", label: "Denim" },
  { value: "jersey", label: "Jersey" },
  { value: "wool", label: "Wool" },
  { value: "leather", label: "Leather" },
  { value: "other", label: "Other" },
] as const;

export type Material = (typeof MATERIALS)[number]["value"];

export const REPORT_REASON_VALUES = [
  "counterfeit",
  "not_as_described",
  "inappropriate",
  "spam",
] as const;

export type ReportReason = (typeof REPORT_REASON_VALUES)[number];

export const REPORT_REASONS: { value: ReportReason; label: string; hint?: string }[] = [
  { value: "counterfeit", label: "Fake or replica" },
  { value: "not_as_described", label: "Not as described", hint: "Photos or details don't match the item." },
  { value: "inappropriate", label: "Not appropriate" },
  { value: "spam", label: "Spam" },
];

export const PHOTO_TIPS = [
  "Daylight",
  "Plain background",
  "The whole item in frame",
  "A close-up of any flaw",
  "If there is a label or tag, take a close-up of it.",
] as const;

// The same five tips, with a line of why and a picture, for the guide a seller
// sees on her first listing and can reopen any time after that. PHOTO_TIPS
// above stays the short form, used where there is no room for this.
//
// `illustration` names a drawing in components/seller/GuideIllustration.tsx.
export type PhotoGuideStep = {
  illustration: "daylight" | "background" | "whole_item" | "flaw" | "label";
  title: string;
  body: string;
};

export const PHOTO_GUIDE: readonly PhotoGuideStep[] = [
  {
    illustration: "daylight",
    title: "Find some daylight",
    body: "Natural light brings out the true colours. A spot by a window works beautifully!",
  },
  {
    illustration: "background",
    title: "Keep the background plain",
    body: "A plain wall, floor, or any neutral background keeps the focus on your clothes.",
  },
  {
    illustration: "whole_item",
    title: "Fit the whole thing in",
    body: "Fit the full item in the frame, from shoulder to hem. Let buyers see the shape!",
  },
  {
    illustration: "flaw",
    title: "Show any flaw up close",
    body: "Add a close-up of any marks, pulls, or faded patches. It helps buyers know exactly what they're getting.",
  },
  {
    illustration: "label",
    title: "Photograph the label",
    body: "A clear photo of the label or tag helps us fill in the brand details.",
  },
] as const;
