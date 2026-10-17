"use client";

import { useRef } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import TextLink from "@/components/ui/TextLink";
import { AiSparkle } from "../AiHints";
import { CONDITIONS, MAX_LISTING_PHOTOS, brandLabel, categoryLabel } from "@/lib/constants";
import { NEED_WORDS, missingFields, photoIssue, type BulkCard as Card, type BulkPhoto } from "./bulkState";

// One listing on the bulk review screen.
//
// NEW, with no design in components.html. Built from existing pieces only:
//   - the photo strip is .sell-form-photos and .sell-form-thumb from the form
//   - the cover pill is .photo-slot-cover-label from the photo grid
//   - the per-photo note is .photo-slot-problem, as on the grid
//   - the loading state is .skeleton, as on her profile
//   - the card edge is --border at --radius-sm, the same as .condition-option
// Flagged for Bismah: .bulk-card and everything under it.

type Props = {
  card: Card;
  index: number;
  photos: Record<string, BulkPhoto>;
  /** True when there is another card to merge with. */
  canMerge: boolean;
  splitting: boolean;
  splitSelection: string[];
  onPhotoTap: (photoId: string) => void;
  onAddPhotos: (files: File[]) => void;
  onEdit: () => void;
  onMerge: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onConfirmSplit: () => void;
  onCancelSplit: () => void;
};

function Fact({ text, marked }: { text: string; marked?: boolean }) {
  return (
    <span className="bulk-card-fact">
      {text}
      {marked && <AiSparkle mark="suggested" />}
    </span>
  );
}

export default function BulkCard({
  card,
  index,
  photos,
  canMerge,
  splitting,
  splitSelection,
  onPhotoTap,
  onAddPhotos,
  onEdit,
  onMerge,
  onSplit,
  onDelete,
  onConfirmSplit,
  onCancelSplit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { fields, prefilled } = card;
  const count = card.photoIds.length;
  const issue = photoIssue(card);
  const missing = missingFields(card);
  const room = MAX_LISTING_PHOTOS - count;
  const name = fields.title.trim() || card.itemHint || `Listing ${index + 1}`;

  const condition = CONDITIONS.find((item) => item.value === fields.condition)?.label;
  // A field is marked only while it still holds exactly what the AI put
  // there: an edited field loses its sparkle, as on the single-item form.
  const facts = [
    fields.category && { text: categoryLabel(fields.category), marked: Boolean(prefilled.categoryMark) && fields.category === prefilled.category },
    fields.brand && { text: fields.brand === "other" ? fields.brandOther || "Other" : brandLabel(fields.brand), marked: Boolean(prefilled.brandMark) && fields.brand === prefilled.brand },
    fields.size && { text: fields.size },
    condition && { text: condition, marked: Boolean(prefilled.conditionMark) && fields.condition === prefilled.condition },
  ].filter(Boolean) as { text: string; marked?: boolean }[];

  return (
    <section className="bulk-card" id={`bulk-card-${card.id}`} aria-label={name}>
      <div className="bulk-card-head">
        <p className="bulk-card-name">{name}</p>
        <span className="bulk-card-count">
          {count} photo{count === 1 ? "" : "s"}
        </span>
      </div>

      {splitting && <p className="bulk-card-hint">Tap the photos that belong to a different item.</p>}

      <div className="sell-form-photos">
        {card.photoIds.map((photoId, position) => {
          const photo = photos[photoId];
          if (!photo) return null;
          const selected = splitSelection.includes(photoId);
          return (
            <button
              key={photoId}
              type="button"
              className={["bulk-thumb", splitting && "is-selectable", selected && "is-selected"].filter(Boolean).join(" ")}
              onClick={() => onPhotoTap(photoId)}
              aria-pressed={splitting ? selected : undefined}
              aria-label={splitting ? `Photo ${position + 1}` : `Photo ${position + 1}: move, make cover or remove`}
            >
              <img className="sell-form-thumb" src={photo.url} alt="" />
              {position === 0 && !splitting && <span className="photo-slot-cover-label">Cover</span>}
              {photo.note && !splitting && <span className="photo-slot-problem">{photo.note}</span>}
              {splitting && <span className="bulk-thumb-check" aria-hidden="true">{selected ? "✓" : ""}</span>}
            </button>
          );
        })}
        {!splitting && room > 0 && (
          <>
            <button
              type="button"
              className="sell-form-thumb-add"
              onClick={() => inputRef.current?.click()}
              aria-label="Add a photo to this listing"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
            {/* accept="image/*" and never image/heic: see PhotoSource. */}
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              tabIndex={-1}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []).slice(0, room);
                if (files.length > 0) onAddPhotos(files);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {issue === "few" && (
        <p className="bulk-card-problem">Needs another photo. Add one, or merge it with another listing.</p>
      )}
      {issue === "many" && (
        <p className="bulk-card-problem">
          Too many photos. A listing holds {MAX_LISTING_PHOTOS}: remove some, or split it into two.
        </p>
      )}

      {splitting ? (
        <div className="bulk-card-actions">
          <PrimaryButton
            onClick={onConfirmSplit}
            disabled={splitSelection.length === 0 || splitSelection.length === count}
          >
            {splitSelection.length > 0 ? `Make new listing (${splitSelection.length})` : "Make new listing"}
          </PrimaryButton>
          <TextLink onClick={onCancelSplit}>Cancel</TextLink>
        </div>
      ) : (
        <>
          {card.status === "reading" ? (
            <div className="bulk-card-reading" aria-busy="true">
              <span className="skeleton skeleton-line skeleton-line-title" />
              <span className="skeleton skeleton-line skeleton-line-meta" />
              <span className="sr-only">Reading these photos</span>
            </div>
          ) : (
            <div className="bulk-card-details">
              {facts.length > 0 && (
                <p className="bulk-card-facts">
                  {facts.map((fact, i) => (
                    <Fact key={i} text={fact.text} marked={fact.marked} />
                  ))}
                </p>
              )}
              <p className="bulk-card-price">
                {fields.price ? `Rs ${Number(fields.price).toLocaleString("en-PK")}` : "No price yet"}
              </p>
              {card.status === "failed" && (
                <p className="bulk-card-note">We could not read these photos, so this one is yours to fill in.</p>
              )}
              {card.retakeTip && <p className="bulk-card-note">{card.retakeTip}</p>}
              {missing.length > 0 && (
                <p className="bulk-card-missing">
                  Still needs {missing.map((key) => NEED_WORDS[key] ?? "more details").join(", ")}.
                </p>
              )}
            </div>
          )}

          <div className="bulk-card-actions">
            <SecondaryButton onClick={onEdit}>{missing.length > 0 ? "Add details" : "Edit details"}</SecondaryButton>
            <div className="bulk-card-links">
              {canMerge && <TextLink onClick={onMerge}>Merge</TextLink>}
              {count > 1 && <TextLink onClick={onSplit}>Split</TextLink>}
              <TextLink onClick={onDelete}>Delete</TextLink>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
