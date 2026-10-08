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

type Phase = 'typing' | 'pause' | 'deleting';

export default function HeroSection() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [suggIndex, setSuggIndex] = useState(0);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dissolveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    if (mq.matches) return;

    const onScroll = () => {
      if (!sectionRef.current || !contentRef.current || !dissolveRef.current) return;
      const heroH = sectionRef.current.offsetHeight;
      const y = window.scrollY;

      // Content drifts up and fades out over first 35% of hero height
      const contentProgress = Math.max(0, Math.min(1, y / (heroH * 0.35)));
      contentRef.current.style.opacity = String(1 - contentProgress);
      contentRef.current.style.transform = `translateY(${-contentProgress * 20}px)`;

      // White overlay fades in from 10% to 75% of hero height — hero dissolves to canvas
      const dissolveProgress = Math.max(0, Math.min(1, (y - heroH * 0.1) / (heroH * 0.65)));
      dissolveRef.current.style.opacity = String(dissolveProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    <section ref={sectionRef} className={styles.hero}>
      <div className={styles.heroOverlay} aria-hidden="true" />
      <div ref={dissolveRef} className={styles.heroDissolveOverlay} aria-hidden="true" />

      <div ref={contentRef} className={styles.heroContent}>
        <div className={styles.heroIntro}>
          <h1 className={styles.heroHeadline}>
            great style doesn&rsquo;t have to cost full price.
          </h1>
          <p className={styles.heroSubheading}>
            Buy and sell secondhand fashion in Pakistan.
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
          Browse all listings &rarr;
        </Link>
      </div>
    </section>
  );
}
