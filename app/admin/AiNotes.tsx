"use client";

import type { ReviewNotes } from "@/lib/ai/review";

// The AI notes beside a pending listing: approval copilot and catalogue-photo
// detection (lib/ai/review.ts).
//
// NEW, with no design in components.html. Built from what the queue row
// already uses: .queue-flag for the catalogue flag, the type of
// .queue-description for the notes, .skeleton while it reads. Flagged for
// Bismah, along with .queue-ai.
//
// Notes only. Nothing here can approve, reject or hide anything, and the
// buttons beside it work the same whether these arrived or not.

export type AiNotesState =
  | { status: "loading" }
  | { status: "ready"; notes: ReviewNotes }
  | { status: "failed" };

type Props = {
  state: AiNotesState | undefined;
  onRetry: () => void;
};

export default function AiNotes({ state, onRetry }: Props) {
  if (!state || state.status === "loading") {
    return (
      <div className="queue-ai" aria-busy="true">
        <p className="queue-ai-label">AI notes</p>
        <span className="skeleton skeleton-line skeleton-line-title" />
        <span className="skeleton skeleton-line skeleton-line-meta" />
        <span className="sr-only">Reading the photos</span>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="queue-ai">
        <p className="queue-ai-label">AI notes</p>
        <p className="queue-ai-line">
          AI notes unavailable for this one.{" "}
          <button type="button" className="queue-ai-retry" onClick={onRetry}>
            Try again
          </button>
        </p>
      </div>
    );
  }

  const { notes } = state;
  const flagged =
    Boolean(notes.catalogue) || notes.flawsNotMentioned.length > 0 || (notes.brand !== null && notes.brand.kind !== "matches");

  return (
    <div className="queue-ai">
      <p className="queue-ai-label">{flagged ? "AI notes · worth a look" : "AI notes"}</p>

      {notes.catalogue && (
        <span className="queue-flag">
          Catalogue photo? Photo {notes.catalogue.photos.join(", ")}
        </span>
      )}
      {notes.catalogue && <p className="queue-ai-line">{notes.catalogue.reason}</p>}

      <p className="queue-ai-line">{notes.photosShow}</p>

      {notes.brand && (
        <p className={notes.brand.kind === "matches" ? "queue-ai-line" : "queue-ai-line is-note"}>{notes.brand.text}</p>
      )}

      {notes.flawsNotMentioned.length > 0 && (
        <p className="queue-ai-line is-note">
          Not in her description: {notes.flawsNotMentioned.join("; ")}.
        </p>
      )}
    </div>
  );
}
