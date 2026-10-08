"use client";

import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import FilterChip from "@/components/ui/FilterChip";
import ChipRow from "@/components/ui/ChipRow";
import ConditionPicker from "@/components/seller/ConditionPicker";
import ReplicaPicker from "@/components/seller/ReplicaPicker";
import { CouldItBe, labelWithMark } from "./AiHints";
import type { Prefilled } from "./prefillToForm";
import type { FormFields, SellPhoto } from "./types";
import {
  BRANDS,
  CATEGORIES,
  CITIES,
  CONDITIONS,
  MATERIALS,
  SIZE_OPTIONS,
  brandLabel,
  categoryLabel,
} from "@/lib/constants";
import type { Brand, Category, City, Material, Size } from "@/lib/constants";

// Everything that is not a photo. Photos and the AI read happen on the two
// steps before this one, so by the time she gets here the form is already part
// filled and her job is to correct it rather than compose it.
//
// Fields whose label carries an "AI suggested" marker were filled by Call 1. Fields with a "Could it
// be...?" chip were left empty on purpose, because confidence was low.
//
// There is no suggested price and no price range. She types her own.

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({ value, label: categoryLabel(value) }));
const BRAND_OPTIONS = BRANDS.map((value) => ({ value, label: brandLabel(value) }));

type Props = {
  photos: SellPhoto[];
  coverId: string | null;
  /** Owned by SellFlow, so a trip back to the photos does not wipe it. */
  fields: FormFields;
  onChange: (patch: Partial<FormFields>) => void;
  prefilled: Prefilled;
  /** Set when Call 1 failed. Shown once, quietly: the form still works. */
  prefillError: string | null;
  onBackToPhotos: () => void;
  /** Called once every field validates. SellFlow takes her to the account
   *  step from here: this form no longer ends the flow. */
  onSubmit: () => void;
};

export default function SellForm({
  photos,
  coverId,
  fields,
  onChange,
  prefilled,
  prefillError,
  onBackToPhotos,
  onSubmit,
}: Props) {
  const {
    title, category, brand, brandOther, size,
    condition, description, isReplica, price, city, material,
  } = fields;
  // `colour` is deliberately not destructured: it is filled by the AI, carried
  // in FormFields and saved, but never shown. She has no field to correct, so
  // nothing here should read it.

  // A suggestion she has taken, or dismissed by typing, stops being offered.
  const [takenChips, setTakenChips] = useState<Record<string, boolean>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  // null means this category has no size at all: bags and dupattas.
  const sizeOptions = category ? SIZE_OPTIONS[category] : null;

  function handleCategoryChange(next: Category | "") {
    onChange({ category: next });
    // A size that does not exist in the new category would silently submit.
    const nextOptions = next ? SIZE_OPTIONS[next] : null;
    if (!nextOptions || (size && !nextOptions.includes(size))) onChange({ size: null });
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Take her to the first thing that needs attention.
      document.querySelector<HTMLElement>("[data-error='true']")?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      return;
    }
    // Her listing is complete. The account step is what actually submits it,
    // because until she has an account there is nobody to own the listing.
    onSubmit();
  }

  return (
    <>
      <form className="sell-form" onSubmit={handleSubmit} noValidate>
        <div>
          <span className="sell-form-section-label">Your photos</span>
          <div className="sell-form-photos">
          {photos.map((photo) => (
            <img key={photo.id} className="sell-form-thumb" src={photo.url} alt="" />
          ))}
          {/* Takes her back to the photos step, which is where adding, removing
              and choosing the cover already live. */}
          <button
            type="button"
            className="sell-form-thumb-add"
            onClick={onBackToPhotos}
            aria-label="Add or change photos"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
          </div>
        </div>

        {prefillError && (
          <p className="sell-form-notice">
            {/* "nothing new" rather than "nothing": on a second attempt that
                fails, what an earlier read filled in is still on the form, and
                wiping it because a retry failed would be the wrong trade. */}
            We could not read your photos this time, so there is nothing new filled in below.
            Everything still works, it is just yours to type.
          </p>
        )}

        <div data-error={Boolean(errors.title)}>
          <Input
            label={labelWithMark("Title", title === prefilled.title ? prefilled.titleMark : undefined)}
            placeholder="e.g. Khaadi lawn kurta"
            value={title}
            onChange={(event) => onChange({ title: event.target.value })}
            error={errors.title}
          />
        </div>

        <div>
          <Textarea
            label="Description"
            placeholder="e.g. worn 3–4 times, fits true to size. small mark near the sleeve."
            value={description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>

        <div data-error={Boolean(errors.category)}>
          <Select
            label={labelWithMark(
              "What is it?",
              category === prefilled.category ? prefilled.categoryMark : undefined,
            )}
            placeholder="Pick a category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value as Category | "")}
            error={errors.category}
          />
          {!category && prefilled.categorySuggestion && !takenChips.category && (
            <CouldItBe
              label={categoryLabel(prefilled.categorySuggestion)}
              onPick={() => {
                handleCategoryChange(prefilled.categorySuggestion!);
                setTakenChips((current) => ({ ...current, category: true }));
              }}
            />
          )}
        </div>

        <div data-error={Boolean(errors.brand)}>
          <Select
            label={labelWithMark("Brand", brand === prefilled.brand ? prefilled.brandMark : undefined)}
            placeholder="Pick a brand"
            options={BRAND_OPTIONS}
            value={brand}
            onChange={(event) => onChange({ brand: event.target.value as Brand | "" })}
            error={errors.brand}
          />
          {!brand && prefilled.brandSuggestion && !takenChips.brand && (
            <CouldItBe
              label={brandLabel(prefilled.brandSuggestion)}
              onPick={() => {
                onChange({ brand: prefilled.brandSuggestion! });
                setTakenChips((current) => ({ ...current, brand: true }));
              }}
            />
          )}
        </div>

        {brand === "other" && (
          <div data-error={Boolean(errors.brandOther)}>
            <Input
              label="Which brand?"
              placeholder="As printed on the label"
              value={brandOther}
              onChange={(event) => onChange({ brandOther: event.target.value })}
              error={errors.brandOther}
            />
          </div>
        )}


        {/* Bags and dupattas have no size, so the field is not shown at all. */}
        {sizeOptions && (
          <div data-error={Boolean(errors.size)}>
            <span className="sell-form-section-label">Size</span>
            <ChipRow label="Size">
              {sizeOptions.map((option) => (
                <FilterChip
                  key={option}
                  active={size === option}
                  onClick={() => onChange({ size: size === option ? null : option })}
                >
                  {option}
                </FilterChip>
              ))}
            </ChipRow>
            {errors.size && <p className="input-error-msg">{errors.size}</p>}
          </div>
        )}

        <div data-error={Boolean(errors.condition)}>
          {labelWithMark(
            "Condition",
            condition === prefilled.condition ? prefilled.conditionMark : undefined,
            "sell-form-section-label",
          )}
          <ConditionPicker value={condition} onChange={(value) => onChange({ condition: value })} />
          {!condition && prefilled.conditionSuggestion && !takenChips.condition && (
            <CouldItBe
              label={
                CONDITIONS.find((item) => item.value === prefilled.conditionSuggestion)?.label ?? ""
              }
              onPick={() => {
                onChange({ condition: prefilled.conditionSuggestion! });
                setTakenChips((current) => ({ ...current, condition: true }));
              }}
            />
          )}
          {errors.condition && <p className="input-error-msg">{errors.condition}</p>}
        </div>

        <div data-error={Boolean(errors.isReplica)}>
          <span className="sell-form-section-label">Is it a replica?</span>
          <ReplicaPicker value={isReplica} onChange={(value) => onChange({ isReplica: value })} />
          {errors.isReplica && <p className="input-error-msg">{errors.isReplica}</p>}
        </div>

        {/* Written out rather than using <Input>, because the currency sits
            inside the field and that component has no slot for a prefix. Same
            classes, so it still looks and behaves like every other field. */}
        <div data-error={Boolean(errors.price)}>
          <label className="input-label" htmlFor="asking-price">
            Your asking price
          </label>
          <div className="input-with-prefix">
            <span className="input-prefix" aria-hidden="true">
              Rs.
            </span>
            <input
              id="asking-price"
              className={errors.price ? "input input-error" : "input"}
              placeholder="3000"
              inputMode="numeric"
              value={price}
              aria-describedby={errors.price ? "asking-price-error" : undefined}
              aria-invalid={errors.price ? true : undefined}
              // Digits only. type="number" would let the scroll wheel change it.
              onChange={(event) => onChange({ price: event.target.value.replace(/\D/g, "") })}
            />
          </div>
          {errors.price && (
            <p className="input-error-msg" id="asking-price-error">
              {errors.price}
            </p>
          )}
        </div>

        <div data-error={Boolean(errors.city)}>
          <Select
            label="City"
            placeholder="Pick a city"
            options={CITIES}
            value={city}
            onChange={(event) => onChange({ city: event.target.value as City | "" })}
            error={errors.city}
          />
        </div>

        <Select
          label={
            <>
              Material
            </>
          }
          placeholder="Pick a material"
          options={MATERIALS}
          value={material}
          onChange={(event) => onChange({ material: event.target.value as Material | "" })}
        />

        <PrimaryButton type="submit">Submit listing</PrimaryButton>
      </form>
    </>
  );
}
