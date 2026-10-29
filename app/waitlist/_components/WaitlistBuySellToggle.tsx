"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/_components/BuySellToggle.module.css";
import waitlistStyles from "../waitlist.module.css";
import { goToForm } from "./JoinButton";

// A copy of the homepage's Buy / Sell toggle (app/_components/BuySellToggle.tsx),
// kept separate so the homepage file is untouched. Same CSS module, so the two
// look identical below the switch. Differences: Sell / Buy as Fraunces text
// links in place of the segmented control, Sell first and open to begin with,
// the waitlist's own Sell copy, and a founding-seller block at the end of
// Sell in place of the homepage's "List your first item" link.

const BUY_BENEFITS = [
  {
    headline: "Filter by brand, size, and price.",
    body: "No more scrolling endlessly on Instagram. Find exactly what you're looking for on Reloved.",
    photo: "/photos/buy-1.jpg",
  },
  {
    headline: "Every listing checked before it goes live.",
    body: "No fakes, no blurry photos, no surprises. We review every item so you don't have to.",
    photo: "/photos/buy-2.jpg",
  },
  {
    headline: "Message the seller directly on WhatsApp.",
    body: "No middleman, no waiting. See something you like? You're one tap away.",
    photo: "/photos/buy-3.png",
  },
];

const SELL_BENEFITS = [
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
];

const TABS = ["sell", "buy"] as const;

export default function WaitlistBuySellToggle() {
  const [tab, setTab] = useState<"buy" | "sell">("sell");
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const switchRef = useRef<HTMLDivElement>(null);
  const foundingRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  /** The demo video loads only once she has scrolled close to it. */
  const [videoNear, setVideoNear] = useState(false);
  const id = useId();

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // The Buy / Sell row fades up as it arrives, once, like the cards below it.
  useEffect(() => {
    const el = switchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add(waitlistStyles.revealed);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || videoNear) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVideoNear(true);
        observer.disconnect();
      },
      // Sell starts only just below the first screen on a phone, so any
      // margin at all would load it with the page. It starts the moment it is
      // on screen instead, with its poster showing until then.
      { rootMargin: "0px" },
    );
    observer.observe(media);
    return () => observer.disconnect();
  }, [tab, videoNear]);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;
    // The founding-seller block fades in like the cards, but is not one of
    // the three the indicator counts.
    const founding = tab === "sell" ? foundingRef.current : null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.benefitCardRevealed);
          const idx = cards.indexOf(entry.target as HTMLDivElement);
          if (idx !== -1) setActiveIndex(idx);
        });
      },
      { threshold: 0.35 },
    );

    cards.forEach((el) => observer.observe(el));
    if (founding) observer.observe(founding);
    return () => observer.disconnect();
  }, [tab]);

  const count = tab === "buy" ? BUY_BENEFITS.length : SELL_BENEFITS.length;

  return (
    <section className={styles.wrapper} aria-label="How it works">
      {/* Pinned under the nav, so the switch is always in reach. */}
      <div className={styles.stickyHeader}>
        <div ref={switchRef} className={`${styles.stickyInner} ${waitlistStyles.reveal}`}>
          <div className={waitlistStyles.howTabs} role="tablist" aria-label="How it works">
            {TABS.map((value, i) => (
              <span key={value} className={waitlistStyles.howTabItem}>
                {i > 0 && (
                  <span className={waitlistStyles.howTabSep} aria-hidden="true">
                    /
                  </span>
                )}
                <button
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls={`${id}-panel`}
                  className={[waitlistStyles.howTab, tab === value ? waitlistStyles.howTabActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setTab(value);
                    setActiveIndex(0);
                  }}
                >
                  {value === "buy" ? "Buy" : "Sell"}
                </button>
              </span>
            ))}
          </div>

          <div className={styles.scrollIndicator} aria-hidden="true">
            {Array.from({ length: count }).map((_, j) => (
              <div
                key={j}
                className={[styles.indicatorBar, activeIndex === j ? styles.indicatorBarActive : ""].filter(Boolean).join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      {tab === "sell" ? (
        <div id={`${id}-panel`} key={tab} className={styles.sellLayout}>
          <div ref={mediaRef} className={styles.sellMedia}>
            <div className={styles.sellMediaInner}>
              {/* Sell is open from the start, so the video waits until she is
                  near it rather than competing with the first load. The
                  waitlist's own copy, about 1 MB against the homepage's 21. */}
              <video
                className={styles.sellVideo}
                src={videoNear ? "/photos/sell-demo-small.mp4" : undefined}
                poster="/photos/sell-demo-poster.jpg"
                autoPlay={!reducedMotion}
                controls={reducedMotion}
                loop
                muted
                playsInline
                preload={reducedMotion || !videoNear ? "none" : "auto"}
                aria-label="A seller listing her clothes on Reloved"
              />
            </div>
          </div>
          <div className={styles.sellCopy}>
            {SELL_BENEFITS.map((b, i) => (
              <div
                key={b.headline}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={styles.sellBenefit}
              >
                <div className={styles.sellBenefitInner}>
                  <p className={`${styles.benefitHeadline} ${waitlistStyles.benefitLight}`}>{b.headline}</p>
                  <p className={styles.benefitBody}>{b.body}</p>
                </div>
              </div>
            ))}

            <div ref={foundingRef} className={styles.sellBenefit}>
              <div className={styles.sellBenefitInner}>
                <p className={`${styles.benefitHeadline} ${waitlistStyles.benefitLight}`}>
                  Become a founding seller.
                </p>
                <p className={styles.benefitBody}>
                  The first 30 sellers get personal help listing and go live on launch day.
                </p>
                <button type="button" className={waitlistStyles.foundingButton} onClick={() => goToForm("sell")}>
                  Join as a founding seller
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div id={`${id}-panel`} key={tab}>
          {BUY_BENEFITS.map((b, i) => (
            <div
              key={b.headline}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={styles.benefitCard}
            >
              <div className={styles.benefitCardInner}>
                <p className={`${styles.benefitHeadline} ${waitlistStyles.benefitLight}`}>{b.headline}</p>
                <p className={styles.benefitBody}>{b.body}</p>
                <div className={styles.benefitPhotoWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.photo} alt="" className={styles.benefitPhoto} loading={i === 0 ? "eager" : "lazy"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
