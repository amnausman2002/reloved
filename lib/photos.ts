// Gets a seller's photos ready in her browser, before anything is uploaded.
//
// Phones hand us photos we cannot use as they are: iPhones save HEIC, which
// Chrome, Firefox and Edge cannot display, and a modern camera photo is 3-6 MB.
// So here we convert HEIC to JPEG and shrink everything to 1,600 px.
//
// This runs in the browser only. The server still checks every photo itself
// (lib/ai/images.ts) — this makes photos usable, it does not make them trusted.
//
// Drawing a photo onto a canvas also drops its EXIF data, so a seller's home
// GPS location never leaves her phone.

/** Long edge in pixels after resizing. From docs/seller-flow-research.md. */
export const MAX_LONG_EDGE = 1600;
export const JPEG_QUALITY = 0.8;

/** A safety net, not a target: resizing already lands around 200-400 KB. */
const MAX_OUTPUT_MB = 2;

export type PreparedPhoto = {
  file: File;
  originalBytes: number;
  finalBytes: number;
  /** True when this started life as a HEIC or HEIF. */
  convertedFromHeic: boolean;
  /** Set only when something went wrong and we kept the original photo. */
  problem?: string;
  /** True when the photo cannot even be drawn: a HEIC that would not convert,
   *  or a file that decodes to nothing. Callers leave these out and say so,
   *  rather than putting a blank tile in her grid. */
  unusable?: boolean;
};

/** iPhones sometimes hand over a HEIC with no MIME type at all, so check the
 *  file name too rather than trusting `type`. */
function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function withJpgName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

/** heic2any is not safe to run twice at once: overlapping conversions hand
 *  back broken images, which is what put blank tiles in the grid when she
 *  picked several iPhone photos together (21 Oct). Every conversion waits for
 *  the one before it. */
let heicQueue: Promise<unknown> = Promise.resolve();

function heicToJpeg(file: File): Promise<File> {
  const run = heicQueue.then(() => convertHeic(file));
  heicQueue = run.catch(() => undefined);
  return run;
}

async function convertHeic(file: File): Promise<File> {
  // Loaded only when a HEIC actually turns up: the decoder is large and most
  // sellers never need it.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], withJpgName(file.name), { type: "image/jpeg" });
}

async function shrink(file: File, longEdge = MAX_LONG_EDGE): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  const options = {
    maxWidthOrHeight: longEdge,
    maxSizeMB: MAX_OUTPUT_MB,
    initialQuality: JPEG_QUALITY,
    fileType: "image/jpeg",
    // A background worker, so the page keeps responding while this runs.
    useWebWorker: true,
    // Leave EXIF off: it carries GPS location we have no reason to keep.
    preserveExif: false,
  };
  try {
    return await imageCompression(file, options);
  } catch {
    // Some phones decode an image to nothing inside a worker under memory
    // pressure. Once more on the page itself, which is slower but sturdier.
    return imageCompression(file, { ...options, useWebWorker: false });
  }
}

/** Whether the browser can actually draw this file. A HEIC Chrome cannot
 *  read, or a broken conversion, fails here instead of becoming a blank tile. */
async function canDraw(file: File): Promise<boolean> {
  if (typeof createImageBitmap === "undefined") return true;
  try {
    const bitmap = await createImageBitmap(file);
    const ok = bitmap.width > 0 && bitmap.height > 0;
    bitmap.close();
    return ok;
  } catch {
    return false;
  }
}

/** Converts and shrinks one photo. Never throws: if anything fails the seller
 *  keeps her original photo and we say what went wrong. */
export async function preparePhoto(file: File, longEdge = MAX_LONG_EDGE): Promise<PreparedPhoto> {
  const originalBytes = file.size;
  const cameFromHeic = isHeic(file);
  let working = file;

  try {
    if (cameFromHeic) {
      working = await heicToJpeg(working);
    }
  } catch {
    // heic2any's decoder does not read every HEIC: some newer iPhone photos
    // come back "format not supported". Safari reads them natively, so where
    // the browser can draw the original, shrinking it below turns it into a
    // JPEG anyway. Chrome, Firefox and Edge cannot, and those are left out.
    if (!(await canDraw(file))) {
      return {
        file,
        originalBytes,
        finalBytes: originalBytes,
        convertedFromHeic: false,
        problem: "Could not convert this iPhone photo. Try saving it as a JPEG first.",
        unusable: true,
      };
    }
  }

  try {
    working = await shrink(working, longEdge);
  } catch {
    return {
      file: working,
      originalBytes,
      finalBytes: working.size,
      convertedFromHeic: cameFromHeic,
      problem: "Could not shrink this photo, so it was sent at full size.",
      unusable: !(await canDraw(working)),
    };
  }

  return {
    file: working,
    originalBytes,
    finalBytes: working.size,
    convertedFromHeic: cameFromHeic,
  };
}

/** Two at a time, not all at once. Six full-size phone photos decoding
 *  together is enough to run a mid-range phone out of memory, which is the
 *  other way photos came back blank. */
export async function preparePhotos(files: File[]): Promise<PreparedPhoto[]> {
  return mapLimited(files, 2, (file) => preparePhoto(file));
}

/** Runs `task` over `items`, at most `limit` at a time, keeping their order.
 *  Thirty HEIC conversions in parallel can run a mid-range Android phone out
 *  of memory; three at a time keeps the page responsive and barely slower. */
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
  onProgress?: (done: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
      onProgress?.(++done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Small copies only, for the grouping tester (app/dev/group). */
export async function prepareThumbnails(
  files: File[],
  longEdge: number,
  onProgress?: (done: number) => void,
): Promise<PreparedPhoto[]> {
  return mapLimited(files, 3, (file) => preparePhoto(file, longEdge), onProgress);
}

export type BatchPhoto = PreparedPhoto & {
  /** A small copy for the grouping call. Made from the 1,600px JPEG rather
   *  than the original, so a HEIC is only ever converted once. */
  thumb: File;
};

/** Bulk listing: each photo at the normal 1,600px (for prefill, Storage and
 *  the listing) plus a small copy for grouping. Never throws, like
 *  preparePhoto: if the small copy fails, the full one stands in for it. */
export async function prepareBatch(
  files: File[],
  thumbEdge: number,
  onProgress?: (done: number) => void,
): Promise<BatchPhoto[]> {
  return mapLimited(
    files,
    3,
    async (file) => {
      const full = await preparePhoto(file);
      let thumb = full.file;
      try {
        thumb = await shrink(full.file, thumbEdge);
      } catch {
        // The full photo is bigger than it needs to be, and that is all.
      }
      return { ...full, thumb };
    },
    onProgress,
  );
}
