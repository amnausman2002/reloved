"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WaitlistForm from "./WaitlistForm";
import { JOIN_HEADING_ID, JOIN_SECTION_ID } from "./JoinButton";
import styles from "../waitlist.module.css";

// The form section, after kindredofireland.com's footer: a full-bleed photo
// with a frosted panel holding the form. The panel sticks to the bottom of the
// screen from the moment the section appears, so the photo is uncovered above
// it bit by bit, and only shows in full at the very end of the page.
//
// Two arrival effects, each played once: the photo fades in, and, after
// eseagency.ch's footer, the form's lines draw in from left to right with
// their words fading in just behind.

/** Adds `className` to the element the first time enough of it is on screen. */
function useRevealOnce<T extends HTMLElement>(className: string, threshold: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add(className);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [className, threshold]);
  return ref;
}

export default function WaitlistJoin() {
  const imageRef = useRevealOnce<HTMLImageElement>(styles.joinImageIn, 0.1);
  const panelRef = useRevealOnce<HTMLDivElement>(styles.joinPanelIn, 0.4);
  const [saved, setSaved] = useState(false);
  const onSaved = useCallback(() => setSaved(true), []);

  return (
    <section id={JOIN_SECTION_ID} className={styles.joinSection}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className={styles.joinImage} src="/photos/join-bg.jpg" alt="" loading="lazy" />

      <div ref={panelRef} className={styles.joinPanel}>
        {/* Once she has joined, the success message takes this place. */}
        {!saved && (
          <>
            <h2 id={JOIN_HEADING_ID} tabIndex={-1} className={styles.joinHeading}>
              Get in early
            </h2>
            <p className={styles.joinSub}>
              Be first to shop, or join our founding sellers and go live on day one.
            </p>
          </>
        )}

        <WaitlistForm onSaved={onSaved} />
      </div>
    </section>
  );
}
