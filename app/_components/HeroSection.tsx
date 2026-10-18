'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

const SUGGESTIONS = [
  'Y2k crop top',
  'khaadi lawn kurta',
  'lama wide leg pants',
];

const TICKER_PHRASE = 'a more circular way to shop';
const TICKER_REPEAT = 6;

type Phase = 'typing' | 'pause' | 'deleting';

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M4.0238 1.08512c0.98053 0.07105 2.00224 0.54903 2.98028 1.5164 0.97779 -0.9671 1.9986 -1.44417 2.97822 -1.51364 1.1056 -0.07841 2.083 0.36844 2.7902 1.07345 1.3903 1.38614 1.8269 3.89436 0.1017 5.6196 -0.0058 0.00582 -0.0118 0.0115 -0.0179 0.01702L7.33974 12.7949c-0.19051 0.1725 -0.48082 0.1725 -0.67133 0L1.15183 7.79795c-0.0061 -0.00552 -0.01206 -0.0112 -0.01788 -0.01702 -1.73423 -1.73423 -1.299958 -4.24274 0.09494 -5.6278 0.70889 -0.7039 1.68828 -1.14819 2.79491 -1.06801Z"
      />
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
            width="18" height="18" viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
          {query.trim() && (
            <button
              type="submit"
              className={styles.heroSearchSubmit}
              aria-label="Go to results"
            >
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
                <path d="M1 7h22M23 7l-5.5-6M23 7l-5.5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
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
