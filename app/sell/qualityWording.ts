// Turns the photo check's six booleans into something a person would say.
//
// The check is advisory. Nothing here ever blocks: the worst it does is put a
// short note on a photo and offer one sheet with Retake and Keep it as equals.

import type { QualityFlag } from "./aiRequests";

/** Shortest honest label for a flagged photo, shown on the slot itself. */
const SHORT: [keyof QualityFlag, string][] = [
  ["blurry", "Blurry"],
  ["dark", "Dark"],
  ["blends_into_background", "Hard to see"],
  ["busy_background", "Busy"],
  ["item_cropped", "Cut off"],
  ["crooked", "Tilted"],
];

/** The faults on one photo, worst first, as words. Empty when it is fine. */
export function faultsOf(flag: QualityFlag): string[] {
  return SHORT.filter(([key]) => flag[key] === true).map(([, label]) => label);
}

/** A short note for the photo slot, or undefined when there is nothing to say.
 *  Capped at two faults so it never overruns the thumbnail, and only the first
 *  keeps its capital: "Dark, hard to see", not "Dark, Hard to see". */
export function slotNote(flag: QualityFlag | undefined): string | undefined {
  if (!flag) return undefined;
  const faults = faultsOf(flag);
  if (faults.length === 0) return undefined;
  return faults
    .slice(0, 2)
    .map((fault, index) => (index === 0 ? fault : fault.toLowerCase()))
    .join(", ");
}

/** Match on photo_index, never on position. The model does not reliably return
 *  one entry per photo, so flags.length === photos.length is not safe to
 *  assume and a missing entry just means that photo was fine. */
export function flagFor(flags: QualityFlag[], index: number): QualityFlag | undefined {
  return flags.find((flag) => flag.photo_index === index);
}

/** How many photos have anything wrong with them. */
export function flaggedCount(flags: QualityFlag[]): number {
  return flags.filter((flag) => faultsOf(flag).length > 0).length;
}

/** Photo positions the check thinks came from a brand's website or studio.
 *  Kept out of faultsOf: it has its own sheet, because the fix is different
 *  (take your own photo) from every other fault (take this one better). */
export function catalogueIndexes(flags: QualityFlag[]): number[] {
  return flags.filter((flag) => flag.looks_like_catalogue === true).map((flag) => flag.photo_index);
}

/** The sheet's heading. Names the situation; the model's own retake_tip names
 *  the fix underneath it. */
export function qualityHeading(count: number): string {
  if (count === 1) return "Want to try one of these again?";
  return "Want to try these again?";
}
