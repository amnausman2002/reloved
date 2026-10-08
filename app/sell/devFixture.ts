// A filled-in form, for testing everything that happens after the AI.
//
// DEVELOPMENT ONLY. The button that uses this is behind a NODE_ENV check in
// SellFlow, so it is not in the production bundle and cannot be tapped by a
// seller. Delete the whole file once the account step is wired up and there is
// a cheaper way to reach it.
//
// Why it exists: the only route to the details form runs through two Gemini
// calls, and every walk through the account flow was paying for a photo read
// it did not need.

import type { FormFields } from "./types";
import type { Prefilled } from "./prefillToForm";
import { EMPTY_PREFILL } from "./prefillToForm";

/** Every required field answered, so Submit listing passes validation on the
 *  first tap. Values chosen to look like a real listing rather than "test
 *  test", because placeholder-looking data hides spacing problems. */
export const DEV_FIELDS: FormFields = {
  title: "Khaadi lawn kurta",
  category: "kurta",
  brand: "khaadi",
  brandOther: "",
  colour: "blue",
  size: "M",
  condition: "very_good",
  description: "Worn a handful of times, no marks. Fits true to size.",
  isReplica: false,
  price: "2400",
  city: "lahore",
  material: "lawn",
};

/** Marked as if Call 1 had filled them, so the sparkles and the line under the
 *  heading are on screen too. Without this the dev route would draw a form that
 *  no seller ever sees. */
export const DEV_PREFILLED: Prefilled = {
  ...EMPTY_PREFILL,
  title: DEV_FIELDS.title,
  titleMark: "suggested",
  category: "kurta",
  categoryMark: "suggested",
  brand: "khaadi",
  brandMark: "suggested",
  colour: "blue",
  condition: "very_good",
  conditionMark: "suggested",
};
