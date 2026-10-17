// The parts of bulk grouping that are plain rules, not AI. No @google/genai
// here, so the browser can import this too: the "Sort them myself" fallback
// runs groupByTime on the phone when the grouping call fails.

/** What the browser knows about each photo before it is resized. Captured
 *  from the original File, because resizing makes a new one and loses both. */
export type PhotoMeta = { name: string; lastModified: number };

/** Photo numbers are positions in the batch, in the order she picked them. */
export type PhotoGroup = { photos: number[]; itemHint?: string };

/** Longest edge of the thumbnails sent to the grouping call. Grouping needs
 *  shapes and colours, not label text, and 30 thumbnails at this size are
 *  about 1 MB, against about 10 MB at the 1,600px prefill size. */
export const GROUP_THUMB_EDGE = 512;

/** A gap longer than this between two photos usually means a new item. Used
 *  only by the no-AI fallback; the model gets the gaps and decides itself. */
export const NEW_ITEM_GAP_SECONDS = 90;

/** Some phones (some iPhones in particular) report the moment she picked the
 *  photo, not the moment she took it. Then every photo in the batch carries
 *  nearly the same time, and a wrong hint is worse than none. */
export function timesAreTrustworthy(meta: PhotoMeta[]): boolean {
  if (meta.length === 0) return false;
  if (meta.some((photo) => !Number.isFinite(photo.lastModified) || photo.lastModified <= 0)) {
    return false;
  }
  if (meta.length < 3) return true;
  const times = meta.map((photo) => photo.lastModified);
  return Math.max(...times) - Math.min(...times) >= 2_000;
}

/** Returns the filename only if a camera made it (IMG_1234, PXL_2026...,
 *  20261016_142233). Their running numbers help with grouping. A name she
 *  typed herself ("Amna eid.jpg") is hers and never leaves the phone. */
export function cameraFilename(name: string): string | null {
  const stem = name.split(".")[0] ?? "";
  return /^(IMG|PXL|DSC|DSCN|MVIMG|PHOTO)?[_-]?\d[\d_-]{3,}$/i.test(stem) ? stem : null;
}

export type RepairReport = {
  groups: PhotoGroup[];
  /** Numbers that pointed at no photo, or at one already placed. */
  dropped: number;
  /** Photos the model left out, each given a card of its own. */
  orphans: number;
};

/** Never trust the model to be complete. Afterwards every photo is in exactly
 *  one group, photos inside a group keep her order, and groups are ordered by
 *  their first photo, so the review screen reads like her camera roll. */
export function repairGroups(
  raw: { photos: number[]; item_hint?: string }[],
  count: number,
): RepairReport {
  const placed = new Set<number>();
  const groups: PhotoGroup[] = [];
  let dropped = 0;

  for (const group of raw) {
    const photos: number[] = [];
    for (const index of group.photos) {
      if (!Number.isInteger(index) || index < 0 || index >= count || placed.has(index)) {
        dropped += 1;
        continue;
      }
      placed.add(index);
      photos.push(index);
    }
    if (photos.length === 0) continue;
    const itemHint = group.item_hint?.trim().slice(0, 40);
    groups.push({ photos: photos.sort((a, b) => a - b), ...(itemHint ? { itemHint } : {}) });
  }

  let orphans = 0;
  for (let index = 0; index < count; index += 1) {
    if (!placed.has(index)) {
      orphans += 1;
      groups.push({ photos: [index] });
    }
  }

  groups.sort((a, b) => a.photos[0] - b.photos[0]);
  return { groups, dropped, orphans };
}

/** The fallback when the grouping call fails: start a new card wherever two
 *  photos are more than NEW_ITEM_GAP_SECONDS apart. If the times cannot be
 *  trusted there is nothing to go on, so each photo gets its own card and
 *  she merges them. Either way she reaches the review screen. */
export function groupByTime(meta: PhotoMeta[]): PhotoGroup[] {
  if (!timesAreTrustworthy(meta)) {
    return meta.map((_, index) => ({ photos: [index] }));
  }

  const groups: PhotoGroup[] = [];
  meta.forEach((photo, index) => {
    const previous = meta[index - 1];
    const gapSeconds = previous ? Math.abs(photo.lastModified - previous.lastModified) / 1000 : Infinity;
    if (gapSeconds > NEW_ITEM_GAP_SECONDS) {
      groups.push({ photos: [index] });
    } else {
      groups[groups.length - 1].photos.push(index);
    }
  });
  return groups;
}
