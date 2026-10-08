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
    body: 'Buyers message you on WhatsApp. No negotiating through a platform. No fees.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h16v10H2z" /><path d="M6 14l-2 4M14 14l2 4" />
      </svg>
    ),
  },
  {
    headline: 'Listings reviewed before going live.',
    body: 'Every item passes a quick check. This keeps the quality high for buyers — and for you.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10l4 4 8-8" />
      </svg>
    ),
  },
];

const N = BUY_BENEFITS.length;
// 2*(N-1) = 4 parts: dwell, slide, dwell, slide
const PARTS = 2 * (N - 1);

function photoYFromProgress(progress: number): number[] {
  return BUY_BENEFITS.map((_, i) => {
    if (i === 0) return 0;
    // Photo i slides in during part (2*i - 1) of PARTS
    const slidePartIndex = 2 * i - 1;
    const partStart = slidePartIndex / PARTS;
    const partEnd = (slidePartIndex + 1) / PARTS;
    const segProg = Math.max(0, Math.min(1, (progress - partStart) / (partEnd - partStart)));
    return Math.round((1 - segProg) * 100);
  });
}

export default function BuySellToggle() {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [activeSlide, setActiveSlide] = useState(0);
  const [photoYArr, setPhotoYArr] = useState<number[]>(() =>
    BUY_BENEFITS.map((_, i) => (i === 0 ? 0 : 100))
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const id = useId();

  useEffect(() => {
    const onScroll = () => {
      if (!trackRef.current || trackRef.current.offsetHeight === 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      const navH = 56;
      const viewH = window.innerHeight;
      const stickyH = viewH - navH;
      const trackH = trackRef.current.offsetHeight;
      const scrollable = trackH - stickyH;
      const scrolledIn = Math.max(0, -(rect.top - navH));
      if (scrollable <= 0) return;
      const progress = Math.min(1, scrolledIn / scrollable);

      // Caption changes when photo is halfway through its slide
      let slide = 0;
      for (let i = N - 1; i >= 1; i--) {
        const slideMid = (2 * i - 1 + 0.5) / PARTS;
        if (progress >= slideMid) { slide = i; break; }
      }
      setActiveSlide(slide);
      setPhotoYArr(photoYFromProgress(progress));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function switchTab(next: 'buy' | 'sell') {
    if (next === tab) return;
    if (wrapperRef.current) {
      const navH = 56;
      const top = wrapperRef.current.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'instant' });
    }
    setTab(next);
  }

  function Toggle() {
    return (
      <div className={styles.tabList} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'buy'}
          aria-controls={`${id}-buy`}
          className={[styles.tabBtn, tab === 'buy' ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
          onClick={() => switchTab('buy')}
        >
          Buy
        </button>
        <button
          role="tab"
          aria-selected={tab === 'sell'}
          aria-controls={`${id}-sell`}
          className={[styles.tabBtn, tab === 'sell' ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
          onClick={() => switchTab('sell')}
        >
          Sell
        </button>
      </div>
    );
  }

  function SellContent() {
    return (
      <div className={styles.sellLayout}>
        <div className={styles.sellMockupWrap}>
          <div className={styles.phoneMockup}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <span className={styles.phoneScreenLabel}>Your listing</span>
            </div>
          </div>
        </div>
        <div className={styles.sellContent}>
          <ul className={styles.sellBenefits}>
            {SELL_BENEFITS.map((b, i) => (
              <li key={i} className={styles.sellBenefit}>
                <span className={styles.sellIcon}>{b.icon}</span>
                <div>
                  <p className={styles.sellHeadline}>{b.headline}</p>
                  <p className={styles.benefitBody}>{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/sell" className={styles.sellCta}>
            List your first item
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.tabBody}>

        {/* ── BUY TAB ── */}
        <div
          id={`${id}-buy`}
          role="tabpanel"
          className={[styles.tabPanel, tab === 'buy' ? styles.tabPanelActive : ''].filter(Boolean).join(' ')}
          aria-hidden={tab !== 'buy' ? 'true' : undefined}
        >
          {/* Scroll track — used for both mobile and desktop */}
          <div ref={trackRef} className={styles.buyScrollTrack}>
            <div className={styles.buyScrollSticky}>

              {/* Photos — stack and slide up from below on scroll */}
              <div className={styles.buyPhotoArea}>
                {BUY_BENEFITS.map((b, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={b.photo}
                    alt=""
                    className={styles.buyPhoto}
                    style={{ transform: `translateY(${photoYArr[i]}%)`, zIndex: i + 1 }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>

              {/* Caption / text panel */}
              <div className={styles.buyCaption}>
                {Toggle()}
                <div className={styles.buySlideStack}>
                  {BUY_BENEFITS.map((b, i) => (
                    <div
                      key={i}
                      className={[
                        styles.buySlide,
                        i === activeSlide ? styles.buySlideActive : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <p className={styles.benefitHeadline}>{b.headline}</p>
                      <p className={styles.benefitBody}>{b.body}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── SELL TAB ── */}
        <div
          id={`${id}-sell`}
          role="tabpanel"
          className={[styles.tabPanel, tab === 'sell' ? styles.tabPanelActive : ''].filter(Boolean).join(' ')}
          aria-hidden={tab !== 'sell' ? 'true' : undefined}
        >
          {/* Mobile sell */}
          <div className={styles.sellMobile}>
            <div className={styles.sellContainer}>
              {Toggle()}
              <SellContent />
            </div>
          </div>

          {/* Desktop sell — same 280vh height so switching doesn't jump */}
          <div className={styles.sellScrollTrack}>
            <div className={styles.sellScrollSticky}>
              {Toggle()}
              <SellContent />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
