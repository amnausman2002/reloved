"use client";

import { useEffect, useState } from "react";

// The waitlist's own nav: the wordmark and one button, nothing else. The
// shared components/ui/Nav is built around search and the menu, and every
// link in it would be a way off this page. Same .nav classes, so it looks the
// same and is transparent over the hero until she scrolls.

type Props = {
  /** The hero form's email field, which the button scrolls to and focuses. */
  emailInputId: string;
};

export default function WaitlistNav({ emailInputId }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goToForm() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // Gone once she has joined: the hero then shows the success message.
    document.getElementById(emailInputId)?.focus({ preventScroll: true });
  }

  return (
    <nav className={`nav${scrolled ? "" : " nav-transparent"}`}>
      <div className="nav-left">
        <span className="nav-wordmark">reloved.</span>
      </div>
      <div className="nav-right">
        <button type="button" className="nav-sell" onClick={goToForm}>
          Join the waitlist
        </button>
      </div>
    </nav>
  );
}
