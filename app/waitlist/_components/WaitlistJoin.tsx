"use client";

import { useEffect, useRef } from "react";
import WaitlistForm from "./WaitlistForm";
import { JOIN_HEADING_ID, JOIN_SECTION_ID } from "./JoinButton";
import styles from "../waitlist.module.css";

// The form section, after kindredofireland.com's footer: a full-bleed photo
// with a frosted panel holding the form. The panel sticks
// to the bottom of the screen from the moment the section appears, so the
// photo is uncovered above it bit by bit, and only shows in full at the very
// end of the page. The photo also fades in as it arrives.

export default function WaitlistJoin() {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        image.classList.add(styles.joinImageIn);
        observer.disconnect();
      },
      { threshold: 0.1 },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, []);

  return (
    <section id={JOIN_SECTION_ID} className={styles.joinSection}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className={styles.joinImage} src="/photos/join-bg.jpg" alt="" loading="lazy" />

      <div className={styles.joinPanel}>
        <h2 id={JOIN_HEADING_ID} tabIndex={-1} className={styles.joinHeading}>
          Get in early.
        </h2>
        <p className={styles.joinSub}>Be first to shop, or be one of our founding sellers.</p>

        <WaitlistForm />
      </div>
    </section>
  );
}
