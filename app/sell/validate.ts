import { SIZE_OPTIONS } from "@/lib/constants";
import type { FormFields } from "./types";

/** What a listing still needs before it can be submitted, keyed by field.
 *
 *  One function for both flows: SellForm shows these under each field on
 *  Submit, and the bulk review screen counts them across every card ("3
 *  listings need a price"). Two copies would drift, and then a card the
 *  review screen calls complete would fail on the server. */
export function validateFields(fields: FormFields): Partial<Record<keyof FormFields, string>> {
  const { title, category, brand, brandOther, size, condition, isReplica, price, city } = fields;
  // null means this category has no size at all: bags and dupattas.
  const sizeOptions = category ? SIZE_OPTIONS[category] : null;

  const found: Partial<Record<keyof FormFields, string>> = {};
  if (!title.trim()) found.title = "Give it a short title.";
  if (!category) found.category = "Pick a category.";
  if (!brand) found.brand = "Pick one, or choose Not sure / no label.";
  if (brand === "other" && !brandOther.trim()) found.brandOther = "Which brand is it?";
  if (sizeOptions && !size) found.size = "Pick a size.";
  if (!condition) found.condition = "Pick a condition.";
  if (isReplica === null) found.isReplica = "Let buyers know either way.";
  if (!price) found.price = "Add your asking price.";
  if (!city) found.city = "Pick a city.";
  return found;
}
