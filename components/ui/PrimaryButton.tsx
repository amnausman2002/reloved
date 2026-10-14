import type { ButtonHTMLAttributes, ReactNode } from "react";

// .btn-primary from components.html. Full width, sharp corners, 44px minimum
// touch target. Hover inverts to white with a dark border.
//
// `type` defaults to "button" so dropping one inside a form does not submit it
// by accident. Pass type="submit" deliberately.
//
// NEW: the loading state. components.html has no drawing for one, so this is
// flagged for Bismah. Every button that waits on the network needs it: without
// it, a seller taps Submit, nothing visibly changes for the two or three
// seconds the photos take to upload, and she taps again.
//
// It is a spinner next to a changed label, not a replaced label, because the
// label is what tells her which of her taps is still running. The button is
// disabled while it spins, so a double tap cannot post two listings.

type Props = {
  /** Shows the spinner and disables the button. */
  loading?: boolean;
  /** What the button says while it waits. Present tense and specific: "Saving
   *  your listing...", not "Loading". Falls back to the normal label. */
  loadingLabel?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({
  type = "button",
  className,
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={["btn-primary", className, loading && "is-loading"].filter(Boolean).join(" ")}
      // Disabled while it waits, so the same tap cannot be made twice.
      disabled={disabled || loading}
      // A screen reader is told the button is busy rather than silently dead.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
