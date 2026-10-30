"use client";

// The slim form for editing a live listing.
//
// A live listing is "add only, lower only" per the edit rules: the only things
// she can change are the description, the asking price (down), and more
// photos appended at the end. Everything else is shown as a plain summary with
// a note: "Contact us to change this." The summary is deliberately not greyed
// inputs — a seller tapping a disabled field feels broken, where a label with
// a value feels like a settled fact.
//
// Reuses Input, Textarea and PhotoGrid from the shared set. The photo grid is
// in "appendOnly" mode: existing photos are frozen, new ones she adds behave
// like the create flow.

import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Textarea from "@/components/ui/Textarea";
import PhotoGrid from "@/components/seller/PhotoGrid";
import {
  BRANDS,
  CITIES,
  CONDITIONS,
  MATERIALS,
  MAX_LISTING_PHOTOS,
  brandLabel,
  categoryLabel,
} from "@/lib/constants";
import type { FormFields } from "./types";
import type { SellPhoto } from "./types";

type Props = {
  photos: SellPhoto[];
  frozenIds: ReadonlySet<string>;
  coverId: string | null;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (id: string) => void;

  /** The listing's values, as currently saved. Everything but description and
   *  price is shown read-only. */
  fields: FormFields;
  description: string;
  onDescriptionChange: (next: string) => void;
  price: string;
  onPriceChange: (next: string) => void;
  /** The listing's current price. Shown as the ceiling in a hint and enforced
   *  client-side; the server enforces it too. */
  maxPrice: number;

  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
};

function cityLabel(value: string): string {
  return CITIES.find((c) => c.value === value)?.label ?? value;
}

function conditionLabel(value: string | null): string {
  if (!value) return "";
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

function materialLabel(value: string): string {
  if (!value) return "";
  return MATERIALS.find((m) => m.value === value)?.label ?? value;
}

function brandDisplay(brand: string, brandOther: string): string {
  if (brand === "other" && brandOther) return brandOther;
  if ((BRANDS as readonly string[]).includes(brand)) {
    return brandLabel(brand as (typeof BRANDS)[number]);
  }
  return brand;
}

/** Her value, with the one line that says she can't change it here. Lifted into
 *  its own component because the form has seven of these. */
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="locked-field">
      <span className="sell-form-section-label">{label}</span>
      <p className="locked-field-value">{value || "—"}</p>
      <p className="locked-field-note">Contact us to change this.</p>
    </div>
  );
}

export default function LiveEditForm({
  photos,
  frozenIds,
  coverId,
  onAddPhotos,
  onRemovePhoto,
  fields,
  description,
  onDescriptionChange,
  price,
  onPriceChange,
  maxPrice,
  submitting,
  submitError,
  onSubmit,
}: Props) {
  const [priceError, setPriceError] = useState<string | null>(null);

  const canAddMore = photos.length < MAX_LISTING_PHOTOS;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = Number(price);
    if (!price || Number.isNaN(next) || next <= 0) {
      setPriceError("Add your asking price.");
      return;
    }
    if (next > maxPrice) {
      setPriceError("You can only lower the price on a live listing.");
      return;
    }
    setPriceError(null);
    onSubmit();
  }

  const sizeShown = fields.size ?? "";
  const isReplicaShown = fields.isReplica === null ? "" : fields.isReplica ? "Yes" : "No";

  return (
    <form className="sell-form" onSubmit={handleSubmit} noValidate>
      {/* Why the top half of this form is read-only. One line, same place as the
          create flow's "some details were filled in by AI" sub. */}
      <p className="sell-sub sell-sub-tight">
        You can add photos, lower the price, and edit the description. Everything
        else needs us to update it for you.
      </p>

      <div>
        <span className="sell-form-section-label">Your photos</span>
        <PhotoGrid
          mode="appendOnly"
          frozenIds={frozenIds}
          photos={photos}
          coverId={coverId}
          onAdd={onAddPhotos}
          onRemove={onRemovePhoto}
          onSetCover={() => undefined}
        />
        {canAddMore ? (
          <p className="photo-grid-note">
            You can add up to {MAX_LISTING_PHOTOS - photos.length} more photo
            {MAX_LISTING_PHOTOS - photos.length === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>

      <div>
        <Textarea
          label="Description"
          placeholder="e.g. worn 3–4 times, fits true to size."
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </div>

      {/* Price. Same shape as the create form's: a prefix inside the field. */}
      <div data-error={Boolean(priceError)}>
        <label className="input-label" htmlFor="edit-asking-price">
          Your asking price
        </label>
        <div className="input-with-prefix">
          <span className="input-prefix" aria-hidden="true">
            Rs.
          </span>
          <input
            id="edit-asking-price"
            className={priceError ? "input input-error" : "input"}
            inputMode="numeric"
            value={price}
            aria-describedby={priceError ? "edit-asking-price-error" : "edit-asking-price-hint"}
            aria-invalid={priceError ? true : undefined}
            onChange={(event) => {
              setPriceError(null);
              onPriceChange(event.target.value.replace(/\D/g, ""));
            }}
          />
        </div>
        {priceError ? (
          <p className="input-error-msg" id="edit-asking-price-error">
            {priceError}
          </p>
        ) : (
          <p className="input-hint" id="edit-asking-price-hint">
            You can lower it, up to Rs {maxPrice.toLocaleString("en-PK")}.
          </p>
        )}
      </div>

      <LockedField label="Title" value={fields.title} />
      <LockedField
        label="What is it?"
        value={fields.category ? categoryLabel(fields.category) : ""}
      />
      <LockedField label="Brand" value={brandDisplay(fields.brand, fields.brandOther)} />
      {sizeShown && <LockedField label="Size" value={sizeShown} />}
      <LockedField label="Condition" value={conditionLabel(fields.condition)} />
      <LockedField label="Is it a replica?" value={isReplicaShown} />
      <LockedField label="City" value={cityLabel(fields.city)} />
      {fields.material && <LockedField label="Material" value={materialLabel(fields.material)} />}

      {submitError && <p className="input-error-msg">{submitError}</p>}

      <PrimaryButton type="submit" loading={submitting} loadingLabel="Saving...">
        Save changes
      </PrimaryButton>
    </form>
  );
}

