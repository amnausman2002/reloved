"use client";

// Every "Join the waitlist" button on the page that is not the form's own
// submit: it takes her to the very end of the page, where the form is, and
// where the photo behind it shows in full.

export const JOIN_SECTION_ID = "join";
export const JOIN_HEADING_ID = "join-heading";

export default function JoinButton({ className }: { className: string }) {
  function goToForm() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    // The heading, not the email field: focusing a field would throw the
    // keyboard up over the form before she has seen it.
    document.getElementById(JOIN_HEADING_ID)?.focus({ preventScroll: true });
  }

  return (
    <button type="button" className={className} onClick={goToForm}>
      Join the waitlist
    </button>
  );
}
