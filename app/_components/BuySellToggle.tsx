'use client';

import { useState, useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import styles from './BuySellToggle.module.css';

const BUY_BENEFITS = [
  {
    headline: 'Filter by brand, size, and price.',
    body: 'No more scrolling endlessly on Instagram. Find exactly what you\'re looking for on Reloved.',
    photo: '/photos/buy-1.jpg',
  },
  {
    headline: 'Every listing checked before it goes live.',
    body: 'No fakes, no blurry photos, no surprises. We review every item so you don\'t have to.',
    photo: '/photos/buy-2.jpg',
  },
  {
    headline: 'Message the seller directly on WhatsApp.',
    body: 'No middleman, no waiting. See something you like? You\'re one tap away.',
    photo: '/photos/buy-3.png',
  },
];

const SELL_BENEFITS = [
  {
    headline: 'Take photos of everything, we’ll do the rest.',
    body: 'Take photos of your whole wardrobe in one go. AI works out which photos belong to which item and fills in the details for you. You check, tweak, and post.',
  },
  {
    headline: 'No commission. Not now, not later.',
    body: 'You keep every rupee. We don’t charge to list, we don’t take a cut when you sell, and that’s not going to change.',
  },
  {
    headline: 'List in minutes. Reviewed by a real person.',
    body: 'Upload your photos, confirm the details AI fills in, and you’re done. Before anything goes live, the team verifies your item. That’s how buyers trust what they find here.',
  },
];

export default function BuySellToggle() {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const cta = ctaRef.current;
    const observed = cta ? [...cards, cta] : cards;
    if (!observed.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.benefitCardRevealed);
          const idx = cards.indexOf(entry.target as HTMLDivElement);
          if (idx !== -1) setActiveIndex(idx);
        });
      },
      /* Benefits + CTA reveal when 35% of them is in view — a bit before
         the midpoint so they feel like they land as you reach them, not
         after you've scrolled past. */
      { threshold: 0.35 }
    );

    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tab]);

  const benefits = tab === 'buy' ? BUY_BENEFITS : SELL_BENEFITS;
  const isSell = tab === 'sell';

  return (
    /* id: the menu's "How it works" points here. There is no separate page for
       it, and this section is the explanation. */
    <section className={styles.wrapper} id="how-it-works">
      {/* Toggle + indicator, pinned above the card scroller */}
      <div className={styles.stickyHeader}>
        <div className={styles.stickyInner}>
          <div className={styles.tabList} role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'buy'}
              aria-controls={`${id}-panel`}
              className={[styles.tabBtn, tab === 'buy' ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => { setTab('buy'); setActiveIndex(0); }}
            >
              Buy
            </button>
            <button
              role="tab"
              aria-selected={tab === 'sell'}
              aria-controls={`${id}-panel`}
              className={[styles.tabBtn, tab === 'sell' ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => { setTab('sell'); setActiveIndex(0); }}
            >
              Sell
            </button>
          </div>

          {/* Scroll indicator: thin editorial rules, one per benefit */}
          <div className={styles.scrollIndicator} aria-hidden="true">
            {benefits.map((_, j) => (
              <div
                key={j}
                className={[styles.indicatorBar, activeIndex === j ? styles.indicatorBarActive : ''].filter(Boolean).join(' ')}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sell layout: a sticky demo video on the left, benefits scroll on the right.
          Buy layout: original one-column cards with a photo per benefit. */}
      {isSell ? (
        <div id={`${id}-panel`} key={tab} className={styles.sellLayout}>
          <div className={styles.sellMedia}>
            <div className={styles.sellMediaInner}>
              {/* Muted + playsInline + autoPlay are required for mobile autoplay.
                  No controls, no audio — this is a loop illustration, not a video to watch. */}
              <video
                className={styles.sellVideo}
                src="/photos/sell-demo.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className={styles.sellCopy}>
            {SELL_BENEFITS.map((b, i) => (
              <div
                key={i}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={styles.sellBenefit}
              >
                <div className={styles.sellBenefitInner}>
                  <p className={styles.benefitHeadline}>{b.headline}</p>
                  <p className={styles.benefitBody}>{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div id={`${id}-panel`} key={tab}>
          {BUY_BENEFITS.map((b, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={styles.benefitCard}
            >
              <div className={styles.benefitCardInner}>
                <p className={styles.benefitHeadline}>{b.headline}</p>
                <p className={styles.benefitBody}>{b.body}</p>
                <div className={styles.benefitPhotoWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.photo} alt="" className={styles.benefitPhoto} loading={i === 0 ? 'eager' : 'lazy'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell CTA */}
      {isSell && (
        <div ref={ctaRef} className={styles.bottomArea}>
          <Link href="/sell" className={styles.sellCta}>
            List your first item
          </Link>
        </div>
      )}
    </section>
  );
}
