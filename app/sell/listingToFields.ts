// Converts a ListingDetail (what the server sends back for the item page) into
// the FormFields shape SellForm already consumes. One mapping, so the edit
// flow and the create flow stay the same form.
//
// Written here, next to types.ts and prefillToForm.ts, because the Prefilled
// shape and FormFields both live in this folder.

import type { ListingDetail } from "@/lib/data/listing";
import { EMPTY_FIELDS, type FormFields } from "./types";

export function listingToFields(listing: ListingDetail): FormFields {
  return {
    ...EMPTY_FIELDS,
    title: listing.title,
    description: listing.description,
    brand: listing.brand,
    // ListingDetail only carries brandOther when brand === "other".
    brandOther: listing.brandOther ?? "",
    // ListingDetail has no `colour` field: it is captured but never shown and
    // never read back on this page. The AI fills it on create; it is left as
    // the empty default on edit.
    category: listing.category,
    size: listing.size,
    condition: listing.condition,
    isReplica: listing.isReplica,
    price: String(listing.askingPrice),
    city: listing.city,
    // null on the server means "material was never set", which maps to the
    // form's empty string. The server treats "" the same as null on write.
    material: listing.material ?? "",
  };
}
