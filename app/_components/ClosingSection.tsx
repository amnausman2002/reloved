'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function ClosingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoInView, setVideoInView] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVideoInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <footer ref={sectionRef} className={styles.closingSection}>
      {!reducedMotion && videoInView && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src="/photos/hero-video.mp4"
          className={styles.closingBgVideo}
          aria-hidden="true"
        />
      )}
      <div className={styles.closingOverlay} aria-hidden="true" />

      <div className={styles.closingContent}>
        <p className={styles.closingTagline}>get more from your closet today.</p>
        <Link href="/sell" className={styles.closingCta}>
          List your first item
        </Link>
      </div>

      <div className={styles.closingFooter}>
        <p className={styles.footerCopyright}>© Reloved 2026</p>
      </div>
    </footer>
  );
}
