"use client";

// .photo-grid from components.html section 10. This is both the uploader and
// the cover picker: the showcase draws them as two states of one grid, so they
// are one component rather than two.
//
// Rules, from the PRD:
// - Two to six photos, enforced at submit. This grid never blocks her.
// - Exactly one cover. The first photo added becomes it, and choosing another
//   moves that photo to the front, so the grid is the buyer's running order.
//
// CHANGED FROM components.html, agreed on screen with Amna: all six cells are
// always drawn, and every empty one carries a plus and opens the picker. The
// showcase shows one live "Add" cell followed by dimmed placeholders, which
// hides the ceiling until she reaches it. There is no hint line underneath.
//
// The file picker uses accept="image/*" and NEVER lists image/heic. Safari 17+
// reacts to an explicit heic type by converting JPEGs *into* HEIC, which is the
// problem lib/photos.ts exists to solve.

import { useRef, useState } from "react";
import PhotoSlot from "./PhotoSlot";
import ReadOnlyPhotoSlot from "./ReadOnlyPhotoSlot";
import type { GridPhoto } from "./PhotoSlot";
import { MAX_LISTING_PHOTOS } from "@/lib/constants";

/** How much she can do to the grid.
 *
 *   "create"       the sell flow: add, remove, pick the cover.
 *   "appendOnly"   editing a live listing: she can add new photos but existing
 *                  ones are frozen — no remove, no reorder, no cover change.
 *                  Matches the "add only, no swapping" rule.
 *   "full"         editing a rejected listing: same as "create".
 *
 *  "appendOnly" needs to know which ids are the frozen ones, so the new photos
 *  can still be removed before she saves. */
export type PhotoGridMode = "create" | "appendOnly" | "full";

type Props = {
  photos: GridPhoto[];
  coverId: string | null;
  /** Raw files straight from the picker. The caller runs preparePhotos. */
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSetCover: (id: string) => void;
  mode?: PhotoGridMode;
  /** The ids that are already saved on the server, in appendOnly mode.
   *  Everything else in `photos` is a new addition she can still remove. */
  frozenIds?: ReadonlySet<string>;
};

export default function PhotoGrid({
  photos,
  coverId,
  onAdd,
  onRemove,
  onSetCover,
  mode = "create",
  frozenIds,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const room = MAX_LISTING_PHOTOS - photos.length;
    const files = Array.from(fileList).slice(0, room);
    if (files.length > 0) onAdd(files);
    // Clear it, otherwise choosing the same file twice in a row does nothing.
    if (inputRef.current) inputRef.current.value = "";
  }

  const emptyCount = MAX_LISTING_PHOTOS - photos.length;

  return (
    <div className="photo-grid-wrap">
      <div className="photo-grid">
        {photos.map((photo, index) => {
          // In appendOnly mode, the ones that are already saved are frozen:
          // read-only tile, no remove, no cover change. Anything she added in
          // this edit still behaves as a normal grid cell.
          const isFrozen = mode === "appendOnly" && Boolean(frozenIds?.has(photo.id));
          if (isFrozen) {
            return (
              <ReadOnlyPhotoSlot
                key={photo.id}
                photo={photo}
                index={index}
                isCover={photo.id === coverId}
              />
            );
          }
          return (
            <PhotoSlot
              key={photo.id}
              photo={photo}
              index={index}
              isCover={photo.id === coverId}
              isSelected={photo.id === selectedId}
              onSelect={() => setSelectedId(photo.id === selectedId ? null : photo.id)}
              onSetCover={() => {
                onSetCover(photo.id);
                setSelectedId(null);
              }}
              onRemove={() => {
                if (photo.id === selectedId) setSelectedId(null);
                onRemove(photo.id);
              }}
            />
          );
        })}

        {Array.from({ length: emptyCount }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            className="photo-slot is-empty"
            onClick={() => inputRef.current?.click()}
            aria-label={`Add photo ${photos.length + i + 1}`}
          >
            <svg
              className="photo-slot-add-icon"
              width="22"
              height="22"
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
        ))}
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => handleFiles(event.target.files)}
        tabIndex={-1}
      />
    </div>
  );
}
