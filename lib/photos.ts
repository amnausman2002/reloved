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
};

/** iPhones sometimes hand over a HEIC with no MIME type at all, so check the
 *  file name too rather than trusting `type`. */
function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function withJpgName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

async function heicToJpeg(file: File): Promise<File> {
  // Loaded only when a HEIC actually turns up: the decoder is large and most
  // sellers never need it.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], withJpgName(file.name), { type: "image/jpeg" });
}

async function shrink(file: File, longEdge = MAX_LONG_EDGE): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  return imageCompression(file, {
    maxWidthOrHeight: longEdge,
    maxSizeMB: MAX_OUTPUT_MB,
    initialQuality: JPEG_QUALITY,
    fileType: "image/jpeg",
    // A background worker, so the page keeps responding while this runs.
    useWebWorker: true,
    // Leave EXIF off: it carries GPS location we have no reason to keep.
    preserveExif: false,
  });
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
    return {
      file,
      originalBytes,
      finalBytes: originalBytes,
      convertedFromHeic: false,
      problem: "Could not convert this iPhone photo. Try saving it as a JPEG first.",
    };
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
    };
  }

  return {
    file: working,
    originalBytes,
    finalBytes: working.size,
    convertedFromHeic: cameFromHeic,
  };
}

export async function preparePhotos(files: File[]): Promise<PreparedPhoto[]> {
  return Promise.all(files.map(preparePhoto));
}

/** Bulk listing: small copies for the grouping call (GROUP_THUMB_EDGE in
 *  lib/ai/groupRules.ts). Three at a time, not all at once: thirty HEIC
 *  conversions in parallel can run a mid-range Android phone out of memory.
 *  Results keep the order of `files`. */
export async function prepareThumbnails(
  files: File[],
  longEdge: number,
  onProgress?: (done: number) => void,
): Promise<PreparedPhoto[]> {
  const results: PreparedPhoto[] = new Array(files.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < files.length) {
      const index = next++;
      results[index] = await preparePhoto(files[index], longEdge);
      onProgress?.(++done);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return results;
}
