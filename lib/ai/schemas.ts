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
        },
        required: [
          "photo_index",
          "blurry",
          "dark",
          "busy_background",
          "blends_into_background",
          "item_cropped",
          "crooked",
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
