import { Type, type Schema } from "@google/genai";
import { z } from "zod";
import { BRANDS, CATEGORIES, CONDITION_VALUES } from "@/lib/constants";

const CONFIDENCE_VALUES = ["high", "medium", "low"] as const;
const BRAND_EVIDENCE_VALUES = ["label_visible", "tag_visible", "print_or_style_only", "none"] as const;
const CATEGORY_VALUES_WITH_UNKNOWN = [...CATEGORIES, "unknown"] as const;
const CONDITION_VALUES_WITH_UNKNOWN = [...CONDITION_VALUES, "unknown"] as const;

// Call 1: photo to listing (lib/ai/prefill.ts)

export const listingDraftSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    brand: { type: Type.STRING, enum: [...BRANDS] },
    brand_other: {
      type: Type.STRING,
      description: "Only if brand is 'other': the brand name as printed on a label",
    },
    brand_evidence: { type: Type.STRING, enum: [...BRAND_EVIDENCE_VALUES] },
    brand_confidence: { type: Type.STRING, enum: [...CONFIDENCE_VALUES] },
    category: { type: Type.STRING, enum: [...CATEGORY_VALUES_WITH_UNKNOWN] },
    category_confidence: { type: Type.STRING, enum: [...CONFIDENCE_VALUES] },
    colour: { type: Type.STRING },
    condition: { type: Type.STRING, enum: [...CONDITION_VALUES_WITH_UNKNOWN] },
    condition_confidence: { type: Type.STRING, enum: [...CONFIDENCE_VALUES] },
    flaws_seen: { type: Type.STRING },
    title_suggestion: { type: Type.STRING },
  },
  required: [
    "brand",
    "brand_evidence",
    "brand_confidence",
    "category",
    "category_confidence",
    "colour",
    "condition",
    "condition_confidence",
    "flaws_seen",
  ],
};

export const listingDraftZodSchema = z.object({
  brand: z.enum(BRANDS),
  brand_other: z.string().optional(),
  brand_evidence: z.enum(BRAND_EVIDENCE_VALUES),
  brand_confidence: z.enum(CONFIDENCE_VALUES),
  category: z.enum(CATEGORY_VALUES_WITH_UNKNOWN),
  category_confidence: z.enum(CONFIDENCE_VALUES),
  colour: z.string(),
  condition: z.enum(CONDITION_VALUES_WITH_UNKNOWN),
  condition_confidence: z.enum(CONFIDENCE_VALUES),
  flaws_seen: z.string(),
  title_suggestion: z.string().optional(),
});

export type ListingDraft = z.infer<typeof listingDraftZodSchema>;

// Call 2: photo quality check (lib/ai/photo-quality.ts)

export const photoQualitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    photo_quality: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          photo_index: { type: Type.INTEGER },
          blurry: { type: Type.BOOLEAN },
          dark: { type: Type.BOOLEAN },
          busy_background: { type: Type.BOOLEAN },
          blends_into_background: { type: Type.BOOLEAN },
          item_cropped: { type: Type.BOOLEAN },
          crooked: { type: Type.BOOLEAN },
          looks_like_catalogue: { type: Type.BOOLEAN },
        },
        required: [
          "photo_index",
          "blurry",
          "dark",
          "busy_background",
          "blends_into_background",
          "item_cropped",
          "crooked",
          "looks_like_catalogue",
        ],
      },
    },
    overall_usable: { type: Type.BOOLEAN },
    retake_tip: { type: Type.STRING },
  },
  required: ["photo_quality", "overall_usable", "retake_tip"],
};

export const photoQualityZodSchema = z.object({
  photo_quality: z.array(
    z.object({
      photo_index: z.number().int(),
      blurry: z.boolean(),
      dark: z.boolean(),
      busy_background: z.boolean(),
      blends_into_background: z.boolean(),
      item_cropped: z.boolean(),
      crooked: z.boolean(),
      // Optional so an answer without it still validates: missing means no.
      looks_like_catalogue: z.boolean().optional(),
    }),
  ),
  overall_usable: z.boolean(),
  retake_tip: z.string(),
});

export type PhotoQuality = z.infer<typeof photoQualityZodSchema>;

// Call 3: bulk grouping (lib/ai/group.ts). Which photos show the same item.
// Nothing else: brand, category and the rest come from Call 1, per group.
// Photo numbers are checked and repaired on the server (repairGroups in
// lib/ai/groupRules.ts), never trusted as they arrive.

export const photoGroupingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    groups: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          photos: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          item_hint: {
            type: Type.STRING,
            description: "2 to 4 plain words naming the item, for example 'black lawn kurta'",
          },
        },
        required: ["photos", "item_hint"],
      },
    },
  },
  required: ["groups"],
};

/** The same template without item_hint, so try-group can measure whether
 *  naming each item actually makes the grouping better. */
export const photoGroupingSchemaNoHint: Schema = {
  type: Type.OBJECT,
  properties: {
    groups: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { photos: { type: Type.ARRAY, items: { type: Type.INTEGER } } },
        required: ["photos"],
      },
    },
  },
  required: ["groups"],
};

export const photoGroupingZodSchema = z.object({
  groups: z.array(
    z.object({
      photos: z.array(z.number().int()),
      item_hint: z.string().optional(),
    }),
  ),
});

export type PhotoGrouping = z.infer<typeof photoGroupingZodSchema>;

// Call 4: admin review (lib/ai/review.ts). The approval copilot and
// catalogue-photo detection in one call, because both look at the same photos
// of the same pending listing.
//
// The model reports what it sees. It does not decide what counts as a flag:
// whether a brand is "backed up" is worked out in code from label_seen and
// label_brand, so the rule ("unknown is never flagged") cannot drift with the
// prompt. There is no price field: there is no original price to compare
// against, and the app never implies it knows what an item is worth.

const LABEL_SEEN_VALUES = ["label_visible", "tag_visible", "none"] as const;

export const listingReviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    photos_show: {
      type: Type.STRING,
      description: "One plain sentence: what the photos show",
    },
    label_seen: { type: Type.STRING, enum: [...LABEL_SEEN_VALUES] },
    label_brand: {
      type: Type.STRING,
      enum: [...BRANDS],
      description: "The brand a readable label, tag or logo shows. 'unknown' if none is readable",
    },
    label_text: {
      type: Type.STRING,
      description: "Only if label_brand is 'other': the brand name as printed",
    },
    flaws_not_mentioned: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Visible flaws her description does not mention, a few words each",
    },
    catalogue_photos: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: "Numbers of photos that look like a brand's studio, website or lookbook image",
    },
    catalogue_reason: {
      type: Type.STRING,
      description: "If any photo is listed above: why, in a few words. Otherwise empty",
    },
  },
  required: ["photos_show", "label_seen", "label_brand", "flaws_not_mentioned", "catalogue_photos"],
};

export const listingReviewZodSchema = z.object({
  photos_show: z.string(),
  label_seen: z.enum(LABEL_SEEN_VALUES),
  label_brand: z.enum(BRANDS),
  label_text: z.string().optional(),
  flaws_not_mentioned: z.array(z.string()),
  catalogue_photos: z.array(z.number().int()),
  catalogue_reason: z.string().optional(),
});

export type ListingReview = z.infer<typeof listingReviewZodSchema>;

// Call 5: duplicate check (lib/ai/duplicate.ts). Is the item she is listing
// the same physical item as one she has already listed? Advisory: it opens a
// sheet with a choice, never a block.

const DUPLICATE_CONFIDENCE_VALUES = ["high", "medium", "low"] as const;

export const duplicateCheckSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          listing: { type: Type.INTEGER, description: "The number of the earlier listing" },
          confidence: { type: Type.STRING, enum: [...DUPLICATE_CONFIDENCE_VALUES] },
        },
        required: ["listing", "confidence"],
      },
    },
  },
  required: ["matches"],
};

export const duplicateCheckZodSchema = z.object({
  matches: z.array(
    z.object({
      listing: z.number().int(),
      confidence: z.enum(DUPLICATE_CONFIDENCE_VALUES),
    }),
  ),
});
