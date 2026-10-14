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
    headline: 'List in minutes.',
    body: 'Take photos, add details, and go live. Our AI fills in the basics so you can focus on the description.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v14M3 10h14" />
      </svg>
    ),
  },
  {
    headline: 'Direct buyer contact.',
    body: 'Buyers message you straight on WhatsApp. No fees, no commission.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h16v10H2z" /><path d="M6 14l-2 4M14 14l2 4" />
      </svg>
    ),
  },
  {
    headline: 'Listings reviewed before going live.',
    body: 'Every item passes a quick check, which keeps quality high for buyers and for you.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10l4 4 8-8" />
      </svg>
    ),
  },
];

export default function BuySellToggle() {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const id = useId();

  // Uses the page's own scroll, not a contained scroller, so a normal swipe
  // or wheel gesture carries straight through this section and on into the
  // rest of the page without getting stuck.
  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = cards.indexOf(entry.target as HTMLDivElement);
          if (idx === -1) return;
          if (entry.isIntersecting) {
            setActiveIndex(idx);
            entry.target.classList.add(styles.benefitCardRevealed);
          }
        });
      },
      { threshold: 0.5 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [tab]);

  const benefits = tab === 'buy' ? BUY_BENEFITS : SELL_BENEFITS;

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

      {/* Benefit cards: each appears in place as the page scrolls to it */}
      <div id={`${id}-panel`} key={tab}>
        {benefits.map((b, i) => (
          <div
            key={i}
            ref={(el) => { cardRefs.current[i] = el; }}
            className={styles.benefitCard}
          >
            <div className={styles.benefitCardInner}>
              <p className={styles.benefitHeadline}>{b.headline}</p>
              <p className={styles.benefitBody}>{b.body}</p>
              {'photo' in b && (
                <div className={styles.benefitPhotoWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.photo} alt="" className={styles.benefitPhoto} loading={i === 0 ? 'eager' : 'lazy'} />
                </div>
              )}
              {'icon' in b && (
                <span className={styles.benefitIcon}>{b.icon}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sell CTA */}
      {tab === 'sell' && (
        <div className={styles.bottomArea}>
          <Link href="/sell" className={styles.sellCta}>
            List your first item
          </Link>
        </div>
      )}
    </section>
  );
}
