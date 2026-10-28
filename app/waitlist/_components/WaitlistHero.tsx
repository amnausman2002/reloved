"use client";

import { useState } from "react";
import styles from "../waitlist.module.css";
import HeroVideo from "./HeroVideo";
import HeroWaitlistForm from "./HeroWaitlistForm";

// A video hero with the words at the bottom left: a large heading, a small
// line under it, and the email line. Tapping into the email darkens the video
// and opens the rest of the form, which pushes the heading up.

export default function WaitlistHero() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section className={styles.hero}>
      <HeroVideo className={styles.heroVideo} />
      <div
        className={[styles.heroShade, formOpen && styles.heroShadeDeep].filter(Boolean).join(" ")}
        aria-hidden="true"
      />

      <div className={styles.heroInner}>
        <div className={styles.heroIntro}>
          <h1 className={styles.heroTitle}>great style doesn&rsquo;t have to cost full price.</h1>
          <p className={styles.heroSub}>Buy and sell preloved women&rsquo;s fashion.</p>
        </div>

        <HeroWaitlistForm onOpenChange={setFormOpen} />
      </div>
    </section>
  );
}
