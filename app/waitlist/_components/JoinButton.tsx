"use client";

import type { Intent } from "../validation";

// Every "Join the waitlist" button on the page that is not the form's own
// submit: it takes her to the very end of the page, where the form is, and
// where the photo behind it shows in full.

export const JOIN_SECTION_ID = "join";
export const JOIN_HEADING_ID = "join-heading";

/** Sent to the form when a button arrives with a choice already made, like
 *  "Join as a founding seller" choosing Sell. */
export const CHOOSE_INTENT_EVENT = "waitlist:choose-intent";

export function goToForm(intent?: Intent) {
  if (intent) window.dispatchEvent(new CustomEvent<Intent>(CHOOSE_INTENT_EVENT, { detail: intent }));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: reduceMotion ? "auto" : "smooth",
  });
  // The heading, not the email field: focusing a field would throw the
  // keyboard up over the form before she has seen it.
  document.getElementById(JOIN_HEADING_ID)?.focus({ preventScroll: true });
}

export default function JoinButton({ className }: { className: string }) {
  return (
    <button type="button" className={className} onClick={() => goToForm()}>
      Join the waitlist
    </button>
  );
}
