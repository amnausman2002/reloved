'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

const SUGGESTIONS = [
  'Khaadi kurta medium size',
  'Generation suit, excellent condition',
  'Y2K crop top XS',
];

const TICKER_PHRASE = 'a more circular way to shop';
const TICKER_REPEAT = 6;

type Phase = 'typing' | 'pause' | 'deleting';

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-10.2-9.3C.1 8.7 1.3 5 5 4.1c2.2-.5 4.2.5 5.6 2.3C11.8 4.6 13.8 3.6 16 4.1c3.7.9 4.9 4.6 3.2 7.6C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export default function HeroSection() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [suggIndex, setSuggIndex] = useState(0);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayText(SUGGESTIONS[0]);
      return;
    }

    const target = SUGGESTIONS[suggIndex];

    if (phase === 'typing') {
      if (displayText.length < target.length) {
        timerRef.current = setTimeout(() => {
          setDisplayText(target.slice(0, displayText.length + 1));
        }, 80);
      } else {
        timerRef.current = setTimeout(() => setPhase('pause'), 2200);
      }
    } else if (phase === 'pause') {
      timerRef.current = setTimeout(() => setPhase('deleting'), 500);
    } else if (phase === 'deleting') {
      if (displayText.length > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 38);
      } else {
        setSuggIndex((i) => (i + 1) % SUGGESTIONS.length);
        setPhase('typing');
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [displayText, phase, suggIndex, reducedMotion]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse');
  }

  const showPlaceholder = !focused && !query;

  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay} aria-hidden="true" />

      <div className={styles.heroContent}>
        <div className={styles.heroIntro}>
          <h1 className={styles.heroHeadline}>
            great style doesn&rsquo;t have to cost full price.
          </h1>
          <p className={styles.heroSubheading}>
            Buy and sell preloved women&rsquo;s fashion in Pakistan
          </p>
        </div>

        <form className={styles.heroSearchBar} onSubmit={handleSubmit}>
          <svg
            className={styles.heroSearchIcon}
            width="18" height="18" viewBox="0 0 20 20"
            fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="6" />
            <path d="M13 13L17.5 17.5" />
          </svg>
          <div className={styles.heroInputWrap}>
            <input
              type="text"
              className={styles.heroInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Search listings"
            />
            {showPlaceholder && (
              <span className={styles.heroTypingPlaceholder} aria-hidden="true">
                {displayText}
                <span className={styles.heroCursor} />
              </span>
            )}
          </div>
        </form>

        <Link href="/browse" className={styles.heroCta}>
          Browse all
        </Link>
      </div>

      <div className={styles.tickerTape} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {[0, 1].map((group) => (
            <div key={group} className={styles.tickerGroup}>
              {Array.from({ length: TICKER_REPEAT }).flatMap((_, i) => [
                <span key={`p-${i}`} className={styles.tickerItem}>{TICKER_PHRASE}</span>,
                <span key={`h-${i}`} className={styles.tickerHeart}>
                  <HeartIcon />
                </span>,
              ])}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
