// A frozen cell for a photo that is already on the listing and cannot be
// changed from the edit screen. Same shape and corners as PhotoSlot so the two
// line up in one grid, but no remove button, no select, no cover picker: a
// live listing is "add only" per the edit rules.

import type { GridPhoto } from "./PhotoSlot";

type Props = {
  photo: GridPhoto;
  index: number;
  isCover: boolean;
};

export default function ReadOnlyPhotoSlot({ photo, index, isCover }: Props) {
  return (
    <div className="photo-slot-wrap">
      <div
        className={["photo-slot", "has-photo", "is-locked", isCover && "is-cover"]
          .filter(Boolean)
          .join(" ")}
        aria-label={isCover ? `Photo ${index + 1}, the cover photo` : `Photo ${index + 1}`}
      >
        <img className="photo-slot-img" src={photo.url} alt="" />
        {isCover && <span className="photo-slot-cover-label">Cover</span>}
      </div>
    </div>
  );
}
