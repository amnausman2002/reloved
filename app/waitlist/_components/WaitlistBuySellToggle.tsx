"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "../waitlist.module.css";
import { goToForm } from "./JoinButton";

// How it works, as a Sell / Buy switch over a one-screen carousel, after
// eseagency.ch's hero. Each benefit fades into the next in the same place;
// a row of bars along the bottom fills as each one plays, about 10 seconds
// apiece. Tapping a bar or swiping left and right jumps to a slide and starts
// its 10 seconds again; it keeps playing on from there.
//
// Both sides: a picture above and the words below on the light canvas. Buy
// changes its photo with each slide and loops. Sell keeps the phone demo
// video still while four slides of words change under it, and stops on the
// last, the founding-seller invitation.

type Slide = {
  headline: string;
  body: string;
  /** Buy only: the photo above the words, which changes with the slide. */
  photo?: string;
  /** Sell's last slide: "Join as a founding seller". */
  founding?: boolean;
};

const BUY_SLIDES: Slide[] = [
  {
    headline: "Filter by brand, size, and price.",
    body: "No more scrolling endlessly on Instagram. Find exactly what you're looking for on Reloved.",
    photo: "/photos/buy-1-slide.jpg",
  },
  {
    headline: "Every listing checked before it goes live.",
    body: "No fakes, no blurry photos, no surprises. We review every item so you don't have to.",
    photo: "/photos/buy-2-slide.jpg",
  },
  {
    headline: "Message the seller directly on WhatsApp.",
    body: "No middleman, no waiting. See something you like? You're one tap away.",
    photo: "/photos/buy-3-slide.jpg",
  },
];

const SELL_SLIDES: Slide[] = [
  {
    headline: "Snap your closet, we’ll do the rest.",
    body: "Take photos of everything in one go. Our AI works out which photos belong to which piece and fills in the details. You check, tweak and post.",
  },
  {
    headline: "No commission. Keep every rupee.",
    body: "Listing is free and we don’t take a cut when you sell.",
  },
  {
    headline: "Live within a day.",
    body: "A real person reviews your listing so buyers can trust what they find. You’ll hear from us within 24 hours.",
  },
  {
    headline: "Become a founding seller.",
    body: "The first 30 sellers get personal help listing and go live on launch day.",
    founding: true,
  },
];

const TABS = ["sell", "buy"] as const;
type Tab = (typeof TABS)[number];

/** How far a finger has to travel sideways to count as a swipe. */
const SWIPE_PX = 40;

export default function WaitlistBuySellToggle() {
  const [tab, setTab] = useState<Tab>("sell");
  const [index, setIndex] = useState(0);
  /** Off when Sell reaches its last slide, and from the start for anyone who
   *  has asked for less motion. */
  const [auto, setAuto] = useState(true);
  /** Counts her own choices, so tapping the bar already playing still
   *  starts its 10 seconds again. */
  const [restarts, setRestarts] = useState(0);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoNear, setVideoNear] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const id = useId();

  const slides = tab === "buy" ? BUY_SLIDES : SELL_SLIDES;
  const loops = tab === "buy";
  const last = slides.length - 1;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);
    if (reduce) setAuto(false);
  }, []);

  // The Sell / Buy row fades up as it arrives, once.
  useEffect(() => {
    const el = switchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add(styles.revealed);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The bars only fill while she can see them, so nobody arrives halfway
  // through. The demo video loads the first time the stage is on screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.intersectionRatio >= 0.5);
        if (entry.isIntersecting) setVideoNear(true);
      },
      { threshold: [0, 0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function switchTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setIndex(0);
    setAuto(!reducedMotion);
  }

  /** Her own choice, by bar or by swipe: that slide, from the start of its
   *  10 seconds, and on from there. */
  function choose(next: number) {
    setIndex(next);
    setRestarts((n) => n + 1);
    setAuto(!reducedMotion);
  }

  /** The current bar has filled: on to the next, or round again, or stop. */
  function advance() {
    if (index < last) setIndex(index + 1);
    else if (loops) setIndex(0);
    else setAuto(false);
  }

  function onTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Mostly sideways only, so scrolling the page past it never changes slide.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) choose(index < last ? index + 1 : loops ? 0 : last);
    else choose(index > 0 ? index - 1 : loops ? last : 0);
  }

  const playing = auto && inView && !hovered;

  return (
    <section className={styles.how} aria-label="How it works">
      <div className={styles.howRow}>
        <div ref={switchRef} className={`${styles.howTabs} ${styles.reveal}`} role="tablist" aria-label="How it works">
          {TABS.map((value, i) => (
            <span key={value} className={styles.howTabItem}>
              {i > 0 && (
                <span className={styles.howTabSep} aria-hidden="true">
                  /
                </span>
              )}
              <button
                role="tab"
                aria-selected={tab === value}
                aria-controls={`${id}-stage`}
                className={[styles.howTab, tab === value && styles.howTabActive].filter(Boolean).join(" ")}
                onClick={() => switchTab(value)}
              >
                {value === "buy" ? "Buy" : "Sell"}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div
        ref={stageRef}
        id={`${id}-stage`}
        className={styles.stage}
        role="region"
        aria-roledescription="carousel"
        aria-label={tab === "buy" ? "Buying on Reloved" : "Selling on Reloved"}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {tab === "sell" && (
          <div className={styles.stageMediaFrame}>
            {/* The waitlist's own copy, about 1 MB against the homepage's 21. */}
            <video
              className={styles.stageVideo}
              src={videoNear ? "/photos/sell-demo-small.mp4" : undefined}
              poster="/photos/sell-demo-poster.jpg"
              autoPlay={!reducedMotion}
              controls={reducedMotion}
              loop
              muted
              playsInline
              preload={videoNear && !reducedMotion ? "auto" : "none"}
              aria-label="A seller listing her clothes on Reloved"
            />
          </div>
        )}

        {slides.map((slide, i) => (
          <div
            key={`${tab}-${slide.headline}`}
            className={[styles.slide, i === index && styles.slideActive].filter(Boolean).join(" ")}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {slide.photo && (
              <div className={styles.stageMediaFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.slidePhoto} src={slide.photo} alt="" loading="lazy" />
              </div>
            )}
            <div className={styles.slideText}>
              <p className={styles.slideHeadline}>{slide.headline}</p>
              <p className={styles.slideBody}>{slide.body}</p>
              {slide.founding && (
                <button type="button" className={styles.foundingButton} onClick={() => goToForm("sell")}>
                  Join as a founding seller
                </button>
              )}
            </div>
          </div>
        ))}

        <div className={styles.bars}>
          {slides.map((slide, i) => {
            const state = i < index ? "done" : i > index ? "todo" : auto ? "playing" : "done";
            return (
              <button
                key={`${tab}-${i}`}
                type="button"
                className={styles.bar}
                aria-label={`Show ${i + 1} of ${slides.length}: ${slide.headline}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => choose(i)}
              >
                <span
                  // A new key restarts the fill whenever this bar becomes current.
                  key={state === "playing" ? `${tab}-${index}-${restarts}` : state}
                  className={[
                    styles.barFill,
                    state === "done" && styles.barFillDone,
                    state === "playing" && styles.barFillPlaying,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ animationPlayState: playing ? "running" : "paused" }}
                  onAnimationEnd={state === "playing" ? advance : undefined}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
