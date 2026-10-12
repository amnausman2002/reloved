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

/** Two drawn-on-the-spot photos, so the dev route can reach Submit.
 *
 *  A real listing needs MIN_LISTING_PHOTOS, and the server enforces it, so a
 *  dev skip with no photos could fill the form but never finish. These are
 *  real JPEGs made in a canvas: they upload to Cloud Storage like any other
 *  photo, which means the dev route exercises the actual upload rather than
 *  pretending to.
 *
 *  Deliberately ugly flat colours. Anything that looked like a real garment
 *  would end up in a screenshot one day and confuse somebody. */
export async function devPhotoFiles(): Promise<File[]> {
  const swatches: Array<[string, string]> = [
    ["#4A5D4E", "DEV PHOTO 1"],
    ["#7A5C4F", "DEV PHOTO 2"],
  ];

  const files = await Promise.all(
    swatches.map(async ([colour, label], index) => {
      // 3:4, the same shape as a browse card, so the thumbnails are not a lie
      // about how a real photo will crop.
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 800;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = colour;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#FFFFFF";
        context.font = "bold 44px sans-serif";
        context.textAlign = "center";
        context.fillText(label, canvas.width / 2, canvas.height / 2);
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8),
      );
      if (!blob) throw new Error("Could not draw a dev photo");
      return new File([blob], `dev-photo-${index + 1}.jpg`, { type: "image/jpeg" });
    }),
  );

  return files;
}

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
