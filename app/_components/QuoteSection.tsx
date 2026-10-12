'use client';

import { useEffect, useRef } from 'react';
import styles from '../page.module.css';

export default function QuoteSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(styles.quoteRevealed);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.quoteSection}>
      <div className={styles.container}>
        <p className={styles.quoteText}>
          Everything you want is already out there, sitting in{' '}
          <em>someone else&rsquo;s closet</em>. We&rsquo;re building the
          place where it finds its next owner, so clothes get a longer
          life and preloved feels <em>as good as new</em>.
        </p>
      </div>
    </section>
  );
}
