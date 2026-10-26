"use client";

// One cell of the photo grid. .photo-slot and friends from components.html
// section 10. PhotoGrid owns the layout and the rules; this draws one slot.
//
// CHANGED FROM components.html, all four agreed on screen with Amna:
//  - the slot and its overlay controls are <button>s, not <div>s, so they can
//    be tabbed to and used without a mouse. The remove control is a sibling
//    positioned over the slot, because a button cannot contain another button.
//  - the remove control draws its X from the icon set. A "times" glyph is
//    centred on its own typographic box rather than on the circle, which is
//    why it always sat slightly high and to the left.
//  - selecting a photo draws no outline on the tile. The only thing that
//    changes is the "Set as cover" bar, inverted to white on black.
//  - the cover badge is a small white pill in the bottom-left corner at 12px
//    radius, not a black bar across the full width.
//
// CHANGED 21 Oct (Amna): "Cover" is the only pill a photo in the grid ever
// carries. The quality note ("Dark, blurry") and the "Check" marker for a
// photo that would not shrink are no longer drawn here. The note still
// appears in the photo quality sheet, which is where it is explained.

export type GridPhoto = {
  id: string;
  /** Object URL or remote URL for the thumbnail. */
  url: string;
  /** Carried through from preparePhotos. Advisory, never blocks submission. */
  problem?: string;
  /** A two-word note from the photo quality check, for example "Dark, blurry".
   *  Also advisory. Takes the corner over `problem` when both are set, because
   *  what the photo looks like matters more to her than how it was converted. */
  note?: string;
};

type Props = {
  photo: GridPhoto;
  index: number;
  isCover: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onSetCover: () => void;
  onRemove: () => void;
};

export default function PhotoSlot({
  photo,
  index,
  isCover,
  isSelected,
  onSelect,
  onSetCover,
  onRemove,
}: Props) {
  const label = `Photo ${index + 1}`;
  const showBar = isSelected && !isCover;

  return (
    <div className="photo-slot-wrap">
      <button
        type="button"
        className={["photo-slot", "has-photo", isCover && "is-cover"].filter(Boolean).join(" ")}
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={isCover ? `${label}, the cover photo` : `${label}, tap to choose as cover`}
      >
        <img className="photo-slot-img" src={photo.url} alt="" />
        {isCover && <span className="photo-slot-cover-label">Cover</span>}
      </button>

      {/* Sibling rather than a child: a button cannot contain another button. */}
      <button
        type="button"
        className="photo-slot-remove"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {showBar && (
        <button type="button" className="photo-slot-set-cover" onClick={onSetCover}>
          Set as cover
        </button>
      )}
    </div>
  );
}
