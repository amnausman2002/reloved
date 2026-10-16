// Runs a mixed batch of photos through the bulk grouping call and grades it.
//
//   npm run try-group -- ./wardrobe              one run, default settings
//   npm run try-group -- ./wardrobe --compare    LOW vs MEDIUM, with and without
//                                                times, with and without item_hint
//   npm run try-group -- ./wardrobe --runs=3     repeat, to see how much it varies
//   npm run try-group -- ./wardrobe --shuffle    ignore her order (a harder test)
//
// Layout: one subfolder per item, that item's photos inside. The subfolders are
// the right answer; the script mixes every photo into one batch, as a seller's
// gallery would, and checks what comes back.
//
// Order: if every photo carries a capture time, the batch is sorted by it,
// which is what a gallery shows. Otherwise it stays folder by folder, which
// makes the job easier than real life, and the script says so.
//
// Thumbnails are made with macOS `sips` at the same 512px the app will send,
// and iPhone HEIC photos are converted the same way. Elsewhere, JPEG, PNG and
// WebP are sent as they are.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { MediaResolution } from "@google/genai";
import { runGroup, type GroupOptions } from "@/lib/ai/group";
import { GROUP_THUMB_EDGE, timesAreTrustworthy, type PhotoGroup, type PhotoMeta } from "@/lib/ai/groupRules";

const SENDABLE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const CONVERTIBLE = new Set([".heic", ".heif"]);

type Photo = { item: string; path: string; meta: PhotoMeta; hasCaptureTime: boolean };

const hasSips = (() => {
  try {
    execFileSync("which", ["sips"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

/** Phones write "YYYY:MM:DD HH:MM:SS" into the photo's EXIF block near the
 *  start of the file. Good enough for a test script; the app gets the time
 *  from the browser instead. */
function captureTime(path: string): number | null {
  const head = readFileSync(path).subarray(0, 128 * 1024).toString("latin1");
  const match = head.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  const time = new Date(y, mo - 1, d, h, mi, s).getTime();
  return Number.isFinite(time) ? time : null;
}

function collectPhotos(root: string): Photo[] {
  const folders = readdirSync(root)
    .map((entry) => join(root, entry))
    .filter((path) => statSync(path).isDirectory())
    .sort();

  const photos: Photo[] = [];
  for (const folder of folders) {
    for (const entry of readdirSync(folder).sort()) {
      const extension = extname(entry).toLowerCase();
      if (!SENDABLE[extension] && !(CONVERTIBLE.has(extension) && hasSips)) continue;
      const path = join(folder, entry);
      const exif = captureTime(path);
      photos.push({
        item: basename(folder),
        path,
        meta: { name: entry, lastModified: exif ?? statSync(path).mtimeMs },
        hasCaptureTime: exif !== null,
      });
    }
  }
  return photos;
}

function toThumbnail(photo: Photo, workDir: string, index: number): File {
  if (hasSips) {
    const out = join(workDir, `${index}.jpg`);
    execFileSync("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", "75",
      "-Z", String(GROUP_THUMB_EDGE),
      photo.path, "--out", out,
    ], { stdio: "ignore" });
    return new File([readFileSync(out)], photo.meta.name, { type: "image/jpeg" });
  }
  return new File([readFileSync(photo.path)], photo.meta.name, {
    type: SENDABLE[extname(photo.path).toLowerCase()],
  });
}

// Grading

type Grade = {
  itemsExact: number;
  items: number;
  precision: number;
  recall: number;
  /** Moves plus merges a seller would need on the review screen. An upper
   *  bound: a split can move several photos in one go. */
  fixes: number;
};

function grade(groups: PhotoGroup[], truth: string[]): Grade {
  const items = [...new Set(truth)];

  const trueSets = new Map<string, string>();
  items.forEach((item) => {
    const members = truth.flatMap((t, i) => (t === item ? [i] : []));
    trueSets.set(item, members.join(","));
  });
  const predictedSets = new Set(groups.map((g) => [...g.photos].sort((a, b) => a - b).join(",")));
  const itemsExact = items.filter((item) => predictedSets.has(trueSets.get(item)!)).length;

  // Pairwise: of the pairs it put together, how many belong together
  // (precision), and of the pairs that belong together, how many it found (recall).
  const groupOf = new Map<number, number>();
  groups.forEach((g, gi) => g.photos.forEach((p) => groupOf.set(p, gi)));
  let tp = 0, fp = 0, fn = 0;
  for (let a = 0; a < truth.length; a += 1) {
    for (let b = a + 1; b < truth.length; b += 1) {
      const together = groupOf.get(a) === groupOf.get(b);
      const shouldBe = truth[a] === truth[b];
      if (together && shouldBe) tp += 1;
      else if (together) fp += 1;
      else if (shouldBe) fn += 1;
    }
  }

  // Fixes: each group belongs to its majority item; every other photo in it
  // is one move; an item spread over several groups needs merges.
  let moves = 0;
  const groupsPerItem = new Map<string, number>();
  for (const g of groups) {
    const counts = new Map<string, number>();
    g.photos.forEach((p) => counts.set(truth[p], (counts.get(truth[p]) ?? 0) + 1));
    const [majority, count] = [...counts].sort((x, y) => y[1] - x[1])[0];
    moves += g.photos.length - count;
    groupsPerItem.set(majority, (groupsPerItem.get(majority) ?? 0) + 1);
  }
  const merges = [...groupsPerItem.values()].reduce((sum, n) => sum + n - 1, 0);

  return {
    itemsExact,
    items: items.length,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
    fixes: moves + merges,
  };
}

function describe(groups: PhotoGroup[], truth: string[]) {
  for (const g of groups) {
    const names = [...new Set(g.photos.map((p) => truth[p]))];
    const whole = names.length === 1 && truth.filter((t) => t === names[0]).length === g.photos.length;
    const mark = whole ? "ok   " : "WRONG";
    console.log(`  ${mark} [${g.photos.join(" ")}]  ${g.itemHint ?? ""}  <- ${g.photos.map((p) => truth[p]).join(", ")}`);
  }
}

// Main

const CONFIGS: { label: string; options: GroupOptions }[] = [
  { label: "LOW, times, hint", options: {} },
  { label: "MEDIUM, times, hint", options: { mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM } },
  { label: "LOW, no times, hint", options: { useTimes: false } },
  { label: "LOW, times, no hint", options: { itemHint: false } },
];

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function main() {
  const args = process.argv.slice(2);
  const root = args.find((arg) => !arg.startsWith("--"));
  if (!root) {
    console.error("Usage: npm run try-group -- <folder> [--compare] [--runs=N] [--shuffle] [--medium] [--no-times] [--no-hint]");
    process.exit(1);
  }
  const runs = Number(args.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 1);

  let photos = collectPhotos(root);
  if (photos.length < 2) {
    console.error(`Need at least 2 photos in subfolders of ${root} (one subfolder per item).`);
    process.exit(1);
  }

  const allTimed = photos.every((p) => p.hasCaptureTime);
  if (args.includes("--shuffle")) {
    photos = shuffle(photos);
    console.log("Order: shuffled (her picking order ignored).");
  } else if (allTimed) {
    photos.sort((a, b) => a.meta.lastModified - b.meta.lastModified);
    console.log("Order: by capture time, as a gallery shows them.");
  } else {
    console.log("Order: folder by folder. Not every photo has a capture time, so this is easier than a real gallery.");
  }

  if (photos.length > 30) {
    console.log(`Keeping the first 30 of ${photos.length} photos, as the app will.`);
    photos = photos.slice(0, 30);
  }

  const meta = photos.map((p) => p.meta);
  const truth = photos.map((p) => p.item);
  console.log(`${photos.length} photos of ${new Set(truth).size} items. Times trustworthy: ${timesAreTrustworthy(meta)}`);
  if (!hasSips) console.log("No sips found: sending originals instead of 512px thumbnails.");

  const workDir = mkdtempSync(join(tmpdir(), "try-group-"));
  const files = photos.map((photo, index) => toThumbnail(photo, workDir, index));
  const kb = Math.round(files.reduce((sum, f) => sum + f.size, 0) / 1024);
  console.log(`Batch size sent: ${kb} KB\n`);

  const configs = args.includes("--compare")
    ? CONFIGS
    : [{
        label: "custom",
        options: {
          ...(args.includes("--medium") ? { mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM } : {}),
          ...(args.includes("--no-times") ? { useTimes: false } : {}),
          ...(args.includes("--no-hint") ? { itemHint: false } : {}),
        },
      }];

  const summary = [];
  for (const config of configs) {
    for (let run = 1; run <= runs; run += 1) {
      console.log(`${config.label}${runs > 1 ? `, run ${run}` : ""}`);
      const result = await runGroup({ photos: files, meta, options: config.options });
      if (!result.ok) {
        console.log(`  FAILED: ${result.error}\n`);
        summary.push({ config: config.label, run, result: "FAILED" });
        continue;
      }
      describe(result.groups, truth);
      const g = grade(result.groups, truth);
      console.log("");
      summary.push({
        config: config.label,
        run,
        "items right": `${g.itemsExact}/${g.items}`,
        fixes: g.fixes,
        precision: g.precision.toFixed(2),
        recall: g.recall.toFixed(2),
        repaired: result.repairs.dropped + result.repairs.orphans,
        ms: result.latencyMs,
        "tokens in": result.tokens.prompt ?? "?",
        thoughts: result.tokens.thoughts ?? "?",
      });
    }
  }

  console.table(summary);
  console.log("fixes = moves and merges she would need on the review screen (lower is better).");
  console.log("precision = pairs put together that belong together. recall = pairs that belong together that were found.");
}

main();
