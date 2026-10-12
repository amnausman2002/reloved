'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

interface Brand {
  name: string;
  slug: string;
  image?: string;
  logo?: string;
}

export default function BrandGrid({ brands }: { brands: Brand[] }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const tiles = grid.querySelectorAll('[data-brand-tile]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add(styles.tileRevealed);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    tiles.forEach((tile) => observer.observe(tile));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.brandGrid} ref={gridRef}>
      {brands.map((brand, i) => (
        <Link
          key={brand.slug}
          href={`/browse?brand=${brand.slug}`}
          className={styles.tile}
          aria-label={`Browse ${brand.name}`}
          data-brand-tile
          style={{ transitionDelay: `${i * 80}ms` }}
        >
          <div className={styles.tileImg}>
            {brand.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.image} alt="" className={styles.tilePhoto} />
                <div className={styles.tileOverlay} />
                {brand.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt={brand.name} className={styles.tileLogo} />
                )}
              </>
            ) : (
              <div className={styles.tileInner}>
                <span className={styles.tileName}>{brand.name}</span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
