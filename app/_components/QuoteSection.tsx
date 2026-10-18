'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../page.module.css';

type Segment = { text: string; italic: boolean };

const SEGMENTS: Segment[] = [
  { text: 'Everything you want is already out there, sitting in ', italic: false },
  { text: "someone else’s closet", italic: true },
  { text: ". We’re building the place where it finds its next owner, so clothes get a longer life and preloved feels ", italic: false },
  { text: 'as good as new', italic: true },
  { text: '.', italic: false },
];

export default function QuoteSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let charIndex = 0;
  const totalChars = SEGMENTS.reduce((sum, s) => sum + s.text.length, 0);
  const msPerChar = 5000 / totalChars;

  return (
    <section ref={sectionRef} className={styles.quoteSection}>
      <div className={styles.container}>
        <p className={styles.quoteText}>
          {SEGMENTS.map((seg, si) => {
            const chars = seg.text.split('').map((ch, ci) => {
              const delay = charIndex * msPerChar;
              charIndex++;
              return (
                <span
                  key={`${si}-${ci}`}
                  className={`${styles.quoteChar}${revealed ? ` ${styles.quoteCharRevealed}` : ''}`}
                  style={{ transitionDelay: `${Math.round(delay)}ms` }}
                >
                  {ch}
                </span>
              );
            });
            return seg.italic ? <em key={si}>{chars}</em> : <span key={si}>{chars}</span>;
          })}
        </p>
      </div>
    </section>
  );
}
