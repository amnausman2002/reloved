"use client";

import { useEffect, useState } from "react";
import JoinButton from "./JoinButton";
import styles from "../waitlist.module.css";

// The waitlist's own nav: the wordmark and one button, nothing else. The
// shared components/ui/Nav is built around search and the menu, and every
// link in it would be a way off this page. Same .nav classes, so it looks the
// same and is transparent over the hero until she scrolls.

export default function WaitlistNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav ${styles.waitlistNav}${scrolled ? "" : " nav-transparent"}`}>
      <div className="nav-left">
        <span className="nav-wordmark">reloved.</span>
      </div>
      <div className="nav-right">
        <JoinButton className="nav-sell" />
      </div>
    </nav>
  );
}
