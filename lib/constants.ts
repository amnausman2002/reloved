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
export const BRAND_LABELS: Partial<Record<Brand, string>> = {
  unknown: "Not sure / no label",
};

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
  { value: "fair", label: "Fair", description: "Shows some signs of wear. Please photograph the areas that show it." },
];

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

export const PHOTO_TIPS = [
  "Daylight",
  "Plain background",
  "The whole item in frame",
  "A close-up of any flaw",
  "If there is a label or tag, take a close-up of it.",
] as const;
