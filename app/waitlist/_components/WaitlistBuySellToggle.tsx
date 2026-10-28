"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/_components/BuySellToggle.module.css";

// A copy of the homepage's Buy / Sell toggle (app/_components/BuySellToggle.tsx),
// kept separate so the homepage file is untouched. Same CSS module, so the two
// look identical. Differences: the Sell side has the waitlist's three lines,
// and there is no "List your first item" link, since this page has no way
// into the app.

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

const SELL_LINES = [
  "List in minutes. Our AI fills in the details from your photos.",
  "Zero commission. Keep every rupee.",
  "Bulk-list a whole closet in one go.",
];

export default function WaitlistBuySellToggle() {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const id = useId();

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;

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
    return () => observer.disconnect();
  }, [tab]);

  const count = tab === "buy" ? BUY_BENEFITS.length : SELL_LINES.length;

  return (
    <section className={styles.wrapper}>
      <div className={styles.stickyHeader}>
        <div className={styles.stickyInner}>
          <div className={styles.tabList} role="tablist">
            {(["buy", "sell"] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                aria-controls={`${id}-panel`}
                className={[styles.tabBtn, tab === value ? styles.tabBtnActive : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  setTab(value);
                  setActiveIndex(0);
                }}
              >
                {value === "buy" ? "Buy" : "Sell"}
              </button>
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
          <div className={styles.sellMedia}>
            <div className={styles.sellMediaInner}>
              {/* Only mounted once she opens Sell, so it never competes with
                  the first load. The waitlist's own copy, compressed to about
                  1 MB from the homepage's 21 MB. */}
              <video
                className={styles.sellVideo}
                src="/photos/sell-demo-small.mp4"
                poster="/photos/sell-demo-poster.jpg"
                autoPlay={!reducedMotion}
                controls={reducedMotion}
                loop
                muted
                playsInline
                preload={reducedMotion ? "none" : "auto"}
                aria-label="A seller listing her clothes on Reloved"
              />
            </div>
          </div>
          <div className={styles.sellCopy}>
            {SELL_LINES.map((line, i) => (
              <div
                key={line}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={styles.sellBenefit}
              >
                <div className={styles.sellBenefitInner}>
                  <p className={styles.benefitHeadline}>{line}</p>
                </div>
              </div>
            ))}
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
                <p className={styles.benefitHeadline}>{b.headline}</p>
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
