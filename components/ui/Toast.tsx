"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// .toast from components.html section 24.
//
// Appears below the nav, auto-dismisses after 4s, one at a time, per
// design-system.md. In a portal so it is never clipped by a form or a step
// that has its own overflow, the same reason BottomSheet is.

const AUTO_DISMISS_MS = 4000;

type Props = {
  message: string | null;
  onDismiss: () => void;
  /** White with a red border, for anything that went wrong. */
  variant?: "default" | "error";
};

export default function Toast({ message, onDismiss, variant = "default" }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message || typeof document === "undefined") return null;

  return createPortal(
    <div className="toast-layer">
      {/* assertive, not polite: she is mid-form and about to act on this. */}
      <div className={variant === "error" ? "toast toast-error" : "toast"} role="alert">
        <span>{message}</span>
        <button type="button" className="toast-dismiss" aria-label="Dismiss" onClick={onDismiss}>
          &times;
        </button>
      </div>
    </div>,
    document.body,
  );
}
