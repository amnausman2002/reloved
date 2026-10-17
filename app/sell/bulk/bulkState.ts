// Bulk listing state, as plain functions. Every correction on the review
// screen (move, merge, split, delete a card, delete a photo, choose a cover)
// is one function here that takes the cards and returns new ones. Nothing in
// this file touches React, the network or the AI, so each rule can be read on
// its own.
//
// The cover is always a card's first photo. Choosing a cover moves that photo
// to the front, exactly as the single-item grid does, so the order on the card
// is the order a buyer will scroll through.

import { MAX_LISTING_PHOTOS, MIN_LISTING_PHOTOS } from "@/lib/constants";
import type { PhotoMeta } from "@/lib/ai/groupRules";
import { EMPTY_PREFILL, type Prefilled } from "../prefillToForm";
import { EMPTY_FIELDS, type FormFields, type SellPhoto } from "../types";
import { validateFields } from "../validate";

export type BulkPhoto = SellPhoto & { thumb: File; meta: PhotoMeta };

export type BulkCard = {
  id: string;
  /** In order, cover first. */
  photoIds: string[];
  fields: FormFields;
  prefilled: Prefilled;
  /** "reading" while Call 1 and Call 2 run for this card. */
  status: "reading" | "ready" | "failed";
  prefillError?: string;
  retakeTip?: string;
  /** From the grouping call, "black lawn kurta". Names the card until she
   *  has a title. */
  itemHint?: string;
};

export function newCard(id: string, photoIds: string[], city: FormFields["city"], itemHint?: string): BulkCard {
  return {
    id,
    photoIds,
    fields: { ...EMPTY_FIELDS, city },
    prefilled: EMPTY_PREFILL,
    status: "reading",
    ...(itemHint ? { itemHint } : {}),
  };
}

/** A card with no photos left is gone. */
function dropEmpty(cards: BulkCard[]): BulkCard[] {
  return cards.filter((card) => card.photoIds.length > 0);
}

export function removePhoto(cards: BulkCard[], photoId: string): BulkCard[] {
  return dropEmpty(
    cards.map((card) => ({ ...card, photoIds: card.photoIds.filter((id) => id !== photoId) })),
  );
}

export function removeCard(cards: BulkCard[], cardId: string): BulkCard[] {
  return cards.filter((card) => card.id !== cardId);
}

export function setCover(cards: BulkCard[], cardId: string, photoId: string): BulkCard[] {
  return cards.map((card) =>
    card.id === cardId
      ? { ...card, photoIds: [photoId, ...card.photoIds.filter((id) => id !== photoId)] }
      : card,
  );
}

/** Onto the end of an existing card, keeping that card's details. Or, with
 *  `created`, onto a new card placed right after the one it came from. */
export function movePhoto(
  cards: BulkCard[],
  photoId: string,
  target: { cardId: string } | { created: BulkCard },
): BulkCard[] {
  const fromIndex = cards.findIndex((card) => card.photoIds.includes(photoId));
  let next = cards.map((card) => ({ ...card, photoIds: card.photoIds.filter((id) => id !== photoId) }));
  if ("cardId" in target) {
    next = next.map((card) =>
      card.id === target.cardId ? { ...card, photoIds: [...card.photoIds, photoId] } : card,
    );
  } else {
    next.splice(fromIndex + 1, 0, { ...target.created, photoIds: [photoId] });
  }
  return dropEmpty(next);
}

/** Two cards become one, in the place of whichever is higher up the list.
 *  The higher card's details win; anything it left empty is taken from the
 *  other, so merging never throws away something she typed. */
export function mergeCards(cards: BulkCard[], aId: string, bId: string): BulkCard[] {
  const aIndex = cards.findIndex((card) => card.id === aId);
  const bIndex = cards.findIndex((card) => card.id === bId);
  if (aIndex < 0 || bIndex < 0 || aIndex === bIndex) return cards;
  const [first, second] = aIndex < bIndex ? [cards[aIndex], cards[bIndex]] : [cards[bIndex], cards[aIndex]];

  const fields = { ...first.fields };
  for (const key of Object.keys(fields) as (keyof FormFields)[]) {
    const mine = fields[key];
    if (mine === "" || mine === null) {
      (fields as Record<string, unknown>)[key] = second.fields[key];
    }
  }

  const merged: BulkCard = {
    ...first,
    photoIds: [...first.photoIds, ...second.photoIds],
    fields,
    // If the first card was still being read, the second card's read stands in.
    status: first.status === "reading" ? second.status : first.status,
  };
  return cards.filter((card) => card.id !== second.id).map((card) => (card.id === first.id ? merged : card));
}

/** The chosen photos leave for a new card placed right after this one. */
export function splitCard(cards: BulkCard[], cardId: string, photoIds: string[], created: BulkCard): BulkCard[] {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index < 0) return cards;
  const chosen = new Set(photoIds);
  const source = cards[index];
  const keep = source.photoIds.filter((id) => !chosen.has(id));
  const leave = source.photoIds.filter((id) => chosen.has(id));
  if (keep.length === 0 || leave.length === 0) return cards;
  const next = [...cards];
  next.splice(index, 1, { ...source, photoIds: keep }, { ...created, photoIds: leave });
  return next;
}

// What is left to do

export type PhotoIssue = "few" | "many" | null;

export function photoIssue(card: BulkCard): PhotoIssue {
  if (card.photoIds.length < MIN_LISTING_PHOTOS) return "few";
  if (card.photoIds.length > MAX_LISTING_PHOTOS) return "many";
  return null;
}

export function missingFields(card: BulkCard): (keyof FormFields)[] {
  return Object.keys(validateFields(card.fields)) as (keyof FormFields)[];
}

export function isComplete(card: BulkCard): boolean {
  return photoIssue(card) === null && missingFields(card).length === 0;
}

/** The words for each gap, as they finish "needs ...". */
export const NEED_WORDS: Partial<Record<keyof FormFields, string>> = {
  price: "a price",
  isReplica: "a replica answer",
  size: "a size",
  condition: "a condition",
  category: "a category",
  brand: "a brand",
  brandOther: "a brand name",
  title: "a title",
  city: "a city",
};

export type MissingLine = { key: string; text: string; firstCardId: string };

/** "3 listings need a price", one line per kind of gap, most common gaps
 *  first. Each line knows the first card it applies to, so tapping it can
 *  scroll there. */
export function missingSummary(cards: BulkCard[]): MissingLine[] {
  const groups = new Map<string, { words: string; cardIds: string[] }>();
  const add = (key: string, words: string, cardId: string) => {
    const entry = groups.get(key) ?? { words, cardIds: [] };
    entry.cardIds.push(cardId);
    groups.set(key, entry);
  };

  for (const card of cards) {
    const issue = photoIssue(card);
    if (issue === "few") add("few", "another photo", card.id);
    if (issue === "many") add("many", "fewer photos", card.id);
    for (const key of missingFields(card)) add(key, NEED_WORDS[key] ?? "more details", card.id);
  }

  const order = ["few", "many", "price", "isReplica", "size", "condition", "category", "brand", "brandOther", "title", "city"];
  return [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([key, { words, cardIds }]) => ({
      key,
      text: `${cardIds.length} listing${cardIds.length === 1 ? " needs" : "s need"} ${words}`,
      firstCardId: cardIds[0],
    }));
}
