// Pakistani brands, then Western/international brands, then the two special values.
// This list lives only here — never copy it into another file.
export const BRANDS = [
  "khaadi",
  "sapphire",
  "generation",
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
  "shoes",
  "bag",
] as const;

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
  { value: "fair", label: "Fair", description: "Shows some signs of wear" },
];

// Photos per listing, enforced at submit, with exactly one cover.
// Deliberately NOT the same as MIN_PHOTOS/MAX_PHOTOS in lib/ai/images.ts: the
// AI call accepts a single photo so it can read early while she is still
// adding more. A finished listing needs two. Different rules, both correct.
export const MIN_LISTING_PHOTOS = 2;
export const MAX_LISTING_PHOTOS = 6;

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

// The four canned rejection reasons. Canned on purpose: a free-text rejection
// would be written differently every time and half of them would say nothing
// useful. The seller's email is built from whichever one we pick.
//
// SHARED FILE. These values and their wording come straight from the PRD and
// CLAUDE.md, so this implements an agreed list rather than inventing one.
// Flagging it for Bismah all the same.
export const REJECTION_REASON_VALUES = [
  "bad_photos",
  "missing_details",
  "not_allowed",
  "suspected_counterfeit",
] as const;

export type RejectionReason = (typeof REJECTION_REASON_VALUES)[number];

/** `label` is the chip in the queue. `sellerMessage` is what she is told, and
 *  is the draft for the email: it says what happened, how to fix it and when
 *  she will hear back, which is the tone design-system.md asks for. The first
 *  two are lifted from its copy samples unchanged. */
export const REJECTION_REASONS: {
  value: RejectionReason;
  label: string;
  sellerMessage: string;
}[] = [
  {
    value: "bad_photos",
    label: "Bad photos",
    sellerMessage:
      "We couldn't see the item clearly enough. Try retaking your photos in natural light and resubmit. We'll review it again within 24 hours!",
  },
  {
    value: "missing_details",
    label: "Missing details",
    sellerMessage:
      "Almost there! A few details are missing. Fill those in and resubmit, and we'll take another look within 24 hours.",
  },
  {
    value: "not_allowed",
    label: "Not allowed",
    sellerMessage:
      "This one isn't something we can list on Reloved. Have a look at what we accept, and do send us anything else you're clearing out!",
  },
  {
    value: "suspected_counterfeit",
    label: "Suspected counterfeit",
    sellerMessage:
      "We couldn't confirm this is the brand on the listing. If you have a label or tag, add a close-up photo of it and resubmit.",
  },
];

// Clothes XS-XL, shoes UK 3-9, bags have no size at all.
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export const SHOE_SIZES = ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9"] as const;

export type Size = (typeof CLOTHING_SIZES)[number] | (typeof SHOE_SIZES)[number];

// Which size list each category uses. null means the category shows no size
// field. Typed as a full Record<Category, ...> on purpose: adding a category to
// CATEGORIES without deciding its sizes then fails the type check.
export const SIZE_OPTIONS: Record<Category, readonly Size[] | null> = {
  kurta: CLOTHING_SIZES,
  pret: CLOTHING_SIZES,
  co_ord_set: CLOTHING_SIZES,
  dupatta: null, // A dupatta has no size, same as a bag.
  dress: CLOTHING_SIZES,
  top: CLOTHING_SIZES,
  bottoms: CLOTHING_SIZES,
  jeans: CLOTHING_SIZES,
  skirt: CLOTHING_SIZES,
  jacket: CLOTHING_SIZES,
  sportswear: CLOTHING_SIZES,
  shoes: SHOE_SIZES,
  bag: null,
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
