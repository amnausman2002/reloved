"use client";

import { useEffect, useState } from "react";
import SecondaryButton from "@/components/ui/SecondaryButton";
import TextLink from "@/components/ui/TextLink";

// What she sees while the two Gemini calls run.
//
// Her own photos are the loader: the deck fans out from behind the cover,
// snaps back together and shakes, over and over. Nothing abstract, and nothing
// that pretends to be a progress bar, because the two calls finish in whatever
// order they finish and we cannot honestly measure how far along they are.
//
// The line underneath changes every couple of seconds. Every line is in the
// present tense and none of them claims to have finished a step: both calls
// run at once, so "almost done" would be a guess, and a loop that came round
// again would make it a visible lie.
//
// NEW, with no design in components.html.

/** Each line is a real thing one of the two calls is doing. Line 2 is the photo
 *  quality call; 3 to 6 are the prefill call reading brand, category, colour
 *  and condition. */
const LINES = [
  "Reading your photos...",
  "Checking they're nice and clear...",
  "Looking for a label or tag...",
  "Working out what it is...",
  "Picking out the colour...",
  "Checking the condition...",
] as const;

/** Must match the reading-line animation in globals.css, or a line will fade
 *  out before its replacement arrives. */
const LINE_MS = 1800;

/** The words on this screen. Bulk listing reuses the loader while it sorts
 *  photos, which is a different job and needs different lines. */
export type ReadingCopy = {
  lines: readonly string[];
  slowLine: string;
  status: string;
  skip: string;
  slowSkip: string;
};

const READING_COPY: ReadingCopy = {
  lines: LINES,
  slowLine: "Still reading. Taking longer than usual today.",
  status: "Reading your photos",
  skip: "Skip and fill it in myself",
  slowSkip: "Fill it in myself instead",
};

type Props = {
  copy?: ReadingCopy;
  /** In order, cover first. The cover sits on top of the deck. */
  photos: { id: string; url: string }[];
  /** Set once the calls have outrun their own timeout. */
  slow: boolean;
  onSkip: () => void;
};

/** Where each card swings to. The cover stays upright and the rest fan out
 *  from behind it, alternating sides so the spread stays balanced. */
function fanAngle(index: number, count: number): number {
  if (index === 0 || count <= 1) return 0;
  const step = Math.min(12, 60 / (count - 1));
  const rank = Math.ceil(index / 2);
  const side = index % 2 === 1 ? -1 : 1;
  return side * rank * step;
}

export default function ReadingPhotos({ photos, slow, onSkip, copy = READING_COPY }: Props) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    // Once we are over time the rotation stops and the screen says so. A loop
    // cheerfully cycling while nothing happens is what makes an app look hung.
    if (slow) return;
    const id = window.setInterval(() => setLine((n) => (n + 1) % copy.lines.length), LINE_MS);
    return () => window.clearInterval(id);
  }, [slow, copy.lines.length]);

  return (
    <div className="sell-step reading-step">
      <div className="reading-middle">
        <div className="reading-deck" aria-hidden="true">
          {photos.map((photo, index) => (
            <img
              key={photo.id}
              className="reading-card"
              src={photo.url}
              alt=""
              style={{
                // Read by the keyframes, so one animation serves every card.
                ["--fan" as string]: `${fanAngle(index, photos.length)}deg`,
                zIndex: photos.length - index,
              }}
            />
          ))}
        </div>

        {slow ? (
          <p className="reading-line is-still">{copy.slowLine}</p>
        ) : (
          // The key is what restarts the fade, so each line arrives the same way.
          <p className="reading-line" key={line} aria-hidden="true">
            {copy.lines[line % copy.lines.length]}
          </p>
        )}

        {/* One steady announcement instead of a new one every 1.8 seconds. */}
        <p className="sr-only" role="status">
          {copy.status}
        </p>
      </div>

      <div className="sell-footer">
        {slow ? (
          <SecondaryButton onClick={onSkip}>{copy.slowSkip}</SecondaryButton>
        ) : (
          <TextLink onClick={onSkip}>{copy.skip}</TextLink>
        )}
      </div>
    </div>
  );
}
