import type {
  Brand,
  Category,
  City,
  ConditionValue,
  ListingStatus,
  RejectionReason,
} from "@/lib/constants";

// Shared sample data for both the item-detail page and the seller-profile
// page, so the two agree on who s1..s8 are and what they've listed. This is
// NOT `lib/data/` — that path is reserved for the real Firestore reads/writes
// CLAUDE.md describes. This file is a flat, explicitly temporary stand-in,
// meant to be deleted once that layer exists.

export type MockPhoto = {
  url: string;
  isCover: boolean;
};

export type MockSeller = {
  id: string;
  displayName: string;
  city: City;
  /** Optional, shown on profile. Most sellers won't have one. */
  bio?: string;
  /** Joined date, shown on profile as "joined". */
  createdAt: string;
};

export type MockListing = {
  id: string;
  title: string;
  description: string;
  brand: Brand;
  brandOther?: string;
  category: Category;
  size: string | null;
  condition: ConditionValue;
  flawNote?: string;
  fitNote?: string;
  isReplica: boolean;
  askingPrice: number;
  isNegotiable: boolean;
  city: City;
  photos: MockPhoto[];
  seller: MockSeller;
  status: ListingStatus;
  /** Seller + admin only. */
  viewCount: number;
  /** Seller + admin only. One row per WhatsApp tap in the real model; here
   *  just a count. */
  contactCount: number;
  /** Set only when status is "rejected". */
  rejectionReason?: RejectionReason;
  createdAt: string;
};

// s1 (Ayesha) is the mock current user — see lib/useCurrentUser.ts — so she
// carries a full mix of statuses to exercise every group the owner view
// renders. Everyone else stays all-"live", same as before this file existed.
export const MOCK_LISTINGS: MockListing[] = [
  {
    id: "1",
    title: "Printed lawn kurta, mustard",
    description:
      "Beautiful printed lawn kurta in mustard tones. Lightweight fabric, perfect for everyday wear. Worn a handful of times, still in great condition. The print is a small floral motif on a warm mustard base. Pairs nicely with white or beige bottoms.",
    brand: "khaadi",
    category: "kurta",
    size: "M",
    condition: "very_good",
    fitNote: "Roomy: would fit a large too",
    isReplica: false,
    askingPrice: 2500,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6511.jpg", isCover: true },
      { url: "/photos/listings/IMG_6512.jpg", isCover: false },
      { url: "/photos/listings/IMG_6513.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "live",
    viewCount: 64,
    contactCount: 5,
    createdAt: "2026-10-04",
  },
  {
    id: "2",
    title: "Block print sleeveless kurta",
    description:
      "Khaadi sleeveless kurta with block print. Never worn, bought last summer and it has been sitting in my closet.",
    brand: "khaadi",
    category: "kurta",
    size: "S",
    condition: "brand_new_without_tags",
    isReplica: false,
    askingPrice: 3200,
    isNegotiable: false,
    city: "karachi",
    photos: [
      { url: "/photos/listings/IMG_6513.jpg", isCover: true },
      { url: "/photos/listings/IMG_6511.jpg", isCover: false },
    ],
    seller: {
      id: "s2",
      displayName: "Sara",
      city: "karachi",
      bio: "Mostly Khaadi and Sapphire, sizes S and M.",
      createdAt: "2026-07-30",
    },
    status: "live",
    viewCount: 41,
    contactCount: 3,
    createdAt: "2026-10-02",
  },
  {
    id: "3",
    title: "Monochrome floral shirt dress",
    description:
      "Cute floral button-up dress. Bought from Quiz in London. Tags still attached, never worn.",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "M",
    condition: "brand_new_with_tags",
    isReplica: false,
    askingPrice: 1800,
    isNegotiable: true,
    city: "islamabad",
    photos: [
      { url: "/photos/listings/IMG_6516.jpg", isCover: true },
      { url: "/photos/listings/IMG_6517.jpg", isCover: false },
      { url: "/photos/listings/IMG_6519.jpg", isCover: false },
    ],
    seller: {
      id: "s3",
      displayName: "Nadia",
      city: "islamabad",
      bio: "Selling pieces I don't wear anymore.",
      createdAt: "2026-09-02",
    },
    status: "live",
    viewCount: 29,
    contactCount: 2,
    createdAt: "2026-10-05",
  },
  {
    id: "4",
    title: "Ribbed polo crop top, lilac",
    description:
      "Light lilac ribbed polo crop top. Goes with everything. Worn a few times but still looks fresh.",
    brand: "unknown",
    category: "top",
    size: "S",
    condition: "very_good",
    isReplica: false,
    askingPrice: 900,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6514.jpg", isCover: true },
      { url: "/photos/listings/IMG_6515.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "live",
    viewCount: 18,
    contactCount: 1,
    createdAt: "2026-09-29",
  },
  {
    id: "5",
    title: "Printed lawn kurta, worn",
    description:
      "Khaadi printed lawn kurta. Shows some wear on the cuffs, reflected in the price. Still has a lot of life in it.",
    brand: "khaadi",
    category: "kurta",
    size: "L",
    condition: "fair",
    flawNote: "Minor pilling on the cuffs",
    isReplica: false,
    askingPrice: 2800,
    isNegotiable: true,
    city: "faisalabad",
    photos: [
      { url: "/photos/listings/IMG_6511.jpg", isCover: true },
      { url: "/photos/listings/IMG_6512.jpg", isCover: false },
    ],
    seller: {
      id: "s4",
      displayName: "Hina",
      city: "faisalabad",
      createdAt: "2026-09-20",
    },
    status: "live",
    viewCount: 9,
    contactCount: 0,
    createdAt: "2026-09-25",
  },
  {
    id: "6",
    title: "Printed lawn kurta, multicolour",
    description:
      "Khaadi printed lawn kurta in vibrant multicolour print. Tags removed but never worn.",
    brand: "khaadi",
    category: "kurta",
    size: "M",
    condition: "brand_new_without_tags",
    isReplica: false,
    askingPrice: 3500,
    isNegotiable: false,
    city: "rawalpindi",
    photos: [
      { url: "/photos/listings/IMG_6512.jpg", isCover: true },
      { url: "/photos/listings/IMG_6511.jpg", isCover: false },
      { url: "/photos/listings/IMG_6513.jpg", isCover: false },
    ],
    seller: {
      id: "s5",
      displayName: "Maira",
      city: "rawalpindi",
      bio: "Clearing out pieces that no longer fit.",
      createdAt: "2026-08-05",
    },
    status: "live",
    viewCount: 22,
    contactCount: 2,
    createdAt: "2026-10-01",
  },
  {
    id: "7",
    title: "Cropped collar top, lilac",
    description:
      "Cropped collar top in soft lilac. Worn twice, basically new. Great for pairing with wide-leg trousers.",
    brand: "unknown",
    category: "top",
    size: "XS",
    condition: "very_good",
    isReplica: false,
    askingPrice: 1200,
    isNegotiable: true,
    city: "karachi",
    photos: [
      { url: "/photos/listings/IMG_6515.jpg", isCover: true },
      { url: "/photos/listings/IMG_6514.jpg", isCover: false },
    ],
    seller: {
      id: "s2",
      displayName: "Sara",
      city: "karachi",
      bio: "Mostly Khaadi and Sapphire, sizes S and M.",
      createdAt: "2026-07-30",
    },
    status: "live",
    viewCount: 15,
    contactCount: 1,
    createdAt: "2026-10-03",
  },
  {
    id: "8",
    title: "Monochrome floral dress",
    description:
      "Quiz monochrome floral dress. Tags removed but never worn, still in perfect condition.",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "S",
    condition: "brand_new_without_tags",
    isReplica: false,
    askingPrice: 2200,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6519.jpg", isCover: true },
      { url: "/photos/listings/IMG_6516.jpg", isCover: false },
      { url: "/photos/listings/IMG_6518.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "live",
    viewCount: 33,
    contactCount: 4,
    createdAt: "2026-09-28",
  },
  {
    id: "9",
    title: "Ribbed collar top, lavender",
    description:
      "Lavender ribbed collar top. Some light bobbling on the front, shown in photos.",
    brand: "unknown",
    category: "top",
    size: "M",
    condition: "fair",
    flawNote: "Light bobbling on the front",
    isReplica: false,
    askingPrice: 750,
    isNegotiable: true,
    city: "islamabad",
    photos: [
      { url: "/photos/listings/IMG_6514.jpg", isCover: true },
      { url: "/photos/listings/IMG_6515.jpg", isCover: false },
    ],
    seller: {
      id: "s3",
      displayName: "Nadia",
      city: "islamabad",
      bio: "Selling pieces I don't wear anymore.",
      createdAt: "2026-09-02",
    },
    status: "live",
    viewCount: 11,
    contactCount: 0,
    createdAt: "2026-09-30",
  },
  {
    id: "10",
    title: "Embroidered lawn kurta",
    description:
      "Khaadi embroidered lawn kurta. Brand new with tags, bought in the sale but never got around to wearing it.",
    brand: "khaadi",
    category: "kurta",
    size: "L",
    condition: "brand_new_with_tags",
    isReplica: false,
    askingPrice: 4000,
    isNegotiable: false,
    city: "multan",
    photos: [
      { url: "/photos/listings/IMG_6511.jpg", isCover: true },
      { url: "/photos/listings/IMG_6513.jpg", isCover: false },
      { url: "/photos/listings/IMG_6512.jpg", isCover: false },
    ],
    seller: {
      id: "s6",
      displayName: "Zara",
      city: "multan",
      bio: "A few brand new with tags, never worn.",
      createdAt: "2026-07-18",
    },
    status: "live",
    viewCount: 27,
    contactCount: 3,
    createdAt: "2026-09-22",
  },
  {
    id: "11",
    title: "Button-up floral dress",
    description:
      "Quiz button-up floral dress. Fits beautifully, worn three times. Great for both casual and semi-formal occasions.",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "S",
    condition: "very_good",
    fitNote: "True to size",
    isReplica: false,
    askingPrice: 1500,
    isNegotiable: true,
    city: "peshawar",
    photos: [
      { url: "/photos/listings/IMG_6516.jpg", isCover: true },
      { url: "/photos/listings/IMG_6518.jpg", isCover: false },
    ],
    seller: {
      id: "s7",
      displayName: "Fatima",
      city: "peshawar",
      bio: "Selling what I don't reach for anymore.",
      createdAt: "2026-09-25",
    },
    status: "live",
    viewCount: 6,
    contactCount: 0,
    createdAt: "2026-09-18",
  },
  {
    id: "12",
    title: "Printed lawn kurta, summer",
    description:
      "Khaadi printed lawn kurta. Tags removed, never worn. Perfect for the heat.",
    brand: "khaadi",
    category: "kurta",
    size: "M",
    condition: "brand_new_without_tags",
    isReplica: false,
    askingPrice: 1900,
    isNegotiable: true,
    city: "hyderabad",
    photos: [
      { url: "/photos/listings/IMG_6513.jpg", isCover: true },
      { url: "/photos/listings/IMG_6512.jpg", isCover: false },
    ],
    seller: {
      id: "s8",
      displayName: "Amna",
      city: "hyderabad",
      bio: "Mix of Khaadi and a few unbranded pieces.",
      createdAt: "2026-08-28",
    },
    status: "live",
    viewCount: 19,
    contactCount: 1,
    createdAt: "2026-10-05",
  },

  // Sara (s2) sold listings, so her public profile shows "N sold".
  {
    id: "18",
    title: "Printed lawn kurta, floral",
    description: "Khaadi printed lawn kurta, floral pattern. Sold.",
    brand: "khaadi",
    category: "kurta",
    size: "S",
    condition: "very_good",
    isReplica: false,
    askingPrice: 2000,
    isNegotiable: true,
    city: "karachi",
    photos: [
      { url: "/photos/listings/IMG_6512.jpg", isCover: true },
      { url: "/photos/listings/IMG_6511.jpg", isCover: false },
    ],
    seller: {
      id: "s2",
      displayName: "Sara",
      city: "karachi",
      bio: "Mostly Khaadi and Sapphire, sizes S and M.",
      createdAt: "2026-07-30",
    },
    status: "sold",
    viewCount: 45,
    contactCount: 4,
    createdAt: "2026-08-15",
  },
  {
    id: "19",
    title: "Collar crop top, white",
    description: "Simple white collar crop top. Sold quickly.",
    brand: "unknown",
    category: "top",
    size: "S",
    condition: "very_good",
    isReplica: false,
    askingPrice: 800,
    isNegotiable: false,
    city: "karachi",
    photos: [
      { url: "/photos/listings/IMG_6515.jpg", isCover: true },
      { url: "/photos/listings/IMG_6514.jpg", isCover: false },
    ],
    seller: {
      id: "s2",
      displayName: "Sara",
      city: "karachi",
      bio: "Mostly Khaadi and Sapphire, sizes S and M.",
      createdAt: "2026-07-30",
    },
    status: "sold",
    viewCount: 31,
    contactCount: 3,
    createdAt: "2026-08-22",
  },

  // Ayesha's (s1) non-live listings, so the owner view has a real example of
  // every status group. Reusing the same three photographed garments as
  // listings 1/4/8 (there are only 9 real sample photos total), so titles
  // describe the same garments rather than claiming a different item.
  {
    id: "13",
    title: "Printed lawn kurta, good as new",
    description: "Khaadi printed lawn kurta, same mustard block print as my other one. Worn once.",
    brand: "khaadi",
    category: "kurta",
    size: "M",
    condition: "very_good",
    isReplica: false,
    askingPrice: 2600,
    isNegotiable: false,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6511.jpg", isCover: true },
      { url: "/photos/listings/IMG_6512.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "sold",
    viewCount: 58,
    contactCount: 6,
    createdAt: "2026-09-10",
  },
  {
    id: "14",
    title: "Ribbed polo crop top, blush",
    description: "Ribbed polo crop top in a soft blush pink, tagged Meme. Light wear.",
    brand: "other",
    brandOther: "Meme",
    category: "top",
    size: "M",
    condition: "very_good",
    isReplica: false,
    askingPrice: 1100,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6514.jpg", isCover: true },
      { url: "/photos/listings/IMG_6515.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "pending",
    viewCount: 0,
    contactCount: 0,
    createdAt: "2026-10-11",
  },
  {
    id: "15",
    title: "Floral shirt dress, black and white",
    description: "Quiz floral shirt dress, black and white print. Elastic waist, pockets.",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "M",
    condition: "very_good",
    isReplica: false,
    askingPrice: 1700,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6516.jpg", isCover: true },
      { url: "/photos/listings/IMG_6517.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "rejected",
    rejectionReason: "suspected_counterfeit",
    viewCount: 0,
    contactCount: 0,
    createdAt: "2026-10-09",
  },
  {
    id: "16",
    title: "Printed lawn kurta, lightly worn",
    description: "A second Khaadi kurta from the same print run. Lightly worn, small mark near the hem.",
    brand: "khaadi",
    category: "kurta",
    size: "L",
    condition: "very_good",
    isReplica: false,
    askingPrice: 2300,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6513.jpg", isCover: true },
      { url: "/photos/listings/IMG_6511.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "expired",
    viewCount: 34,
    contactCount: 2,
    createdAt: "2026-08-20",
  },
  {
    id: "17",
    title: "Floral shirt dress, as new",
    description: "Quiz floral shirt dress, black and white print. Tags removed but never worn.",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "S",
    condition: "brand_new_without_tags",
    isReplica: false,
    askingPrice: 1900,
    isNegotiable: true,
    city: "lahore",
    photos: [
      { url: "/photos/listings/IMG_6518.jpg", isCover: true },
      { url: "/photos/listings/IMG_6519.jpg", isCover: false },
    ],
    seller: {
      id: "s1",
      displayName: "Ayesha",
      city: "lahore",
      bio: "Clearing out my closet, mostly Khaadi and Sapphire.",
      createdAt: "2026-08-12",
    },
    status: "hidden",
    viewCount: 12,
    contactCount: 1,
    createdAt: "2026-09-15",
  },
];

export function getSellerListings(sellerId: string): MockListing[] {
  return MOCK_LISTINGS.filter((l) => l.seller.id === sellerId);
}

export function getSeller(sellerId: string): MockSeller | undefined {
  return getSellerListings(sellerId)[0]?.seller;
}

export function getLiveListings(sellerId: string): MockListing[] {
  return getSellerListings(sellerId).filter((l) => l.status === "live");
}

/** Computed, never stored, per the PRD. */
export function getSoldCount(sellerId: string): number {
  return getSellerListings(sellerId).filter((l) => l.status === "sold").length;
}
