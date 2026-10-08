import Link from 'next/link';
import Nav from '@/components/ui/Nav';
import HeroSection from './_components/HeroSection';
import BuySellToggle from './_components/BuySellToggle';
import styles from './page.module.css';

const BRANDS: { name: string; slug: string; image?: string; logo?: string }[] = [
  { name: 'Khaadi', slug: 'khaadi', image: '/photos/brands/khaadi.png', logo: '/photos/brands/khaadi-logo.png' },
  { name: 'Sapphire', slug: 'sapphire', image: '/photos/brands/sapphire.png', logo: '/photos/brands/sapphire-logo.png' },
  { name: 'Generation', slug: 'generation', image: '/photos/brands/generation.png', logo: '/photos/brands/generation-logo.png' },
  { name: 'Lama', slug: 'lama', image: '/photos/brands/lama.png', logo: '/photos/brands/lama-logo.png' },
  { name: 'Outfitters', slug: 'outfitters', image: '/photos/brands/outfitters.png', logo: '/photos/brands/outfitters-logo.png' },
];

const CATEGORIES = [
  { name: 'Kurta / Pret', slug: 'kurta' },
  { name: 'Co-ords', slug: 'co_ord_set' },
  { name: 'Tops', slug: 'top' },
  { name: 'Bottoms', slug: 'bottoms' },
  { name: 'Dresses', slug: 'dress' },
  { name: 'Shoes', slug: 'shoes' },
  { name: 'Bags', slug: 'bag' },
];

const PRICE_BANDS = [
  { label: 'Under PKR 3,000', max: 3000 },
  { label: 'Under PKR 5,000', max: 5000 },
  { label: 'Under PKR 10,000', max: 10000 },
];

export default function HomePage() {
  return (
    <>
      <Nav />

      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 2–7: all content that slides over the sticky hero */}
        <div className={styles.pageScroll}>

        {/* 2. Buy / Sell toggle + benefits */}
        <BuySellToggle />

        {/* 3. Explore brands */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Explore brands</h2>
              <Link href="/browse" className={styles.browseAll}>Browse all →</Link>
            </div>
            <div className={styles.brandGrid}>
              {BRANDS.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/browse?brand=${brand.slug}`}
                  className={styles.tile}
                  aria-label={`Browse ${brand.name}`}
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
          </div>
        </section>

        {/* 4. Shop by category */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Shop by category</h2>
              <Link href="/browse" className={styles.browseAll}>Browse all →</Link>
            </div>
            <div className={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/browse?category=${cat.slug}`}
                  className={styles.categoryTile}
                  aria-label={`Browse ${cat.name}`}
                >
                  <div className={styles.categoryTileImg}>
                    <span className={styles.tileName}>{cat.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Shop by price */}
        <section className={styles.priceBands}>
          <div className={styles.priceBandsHeading}>
            <h2 className={styles.sectionHeading}>Shop by price</h2>
          </div>
          <div className={styles.priceBandList}>
            {PRICE_BANDS.map((band) => (
              <Link
                key={band.max}
                href={`/browse?maxPrice=${band.max}`}
                className={styles.priceBand}
                aria-label={`Browse listings ${band.label}`}
              >
                <div className={styles.priceBandInner}>
                  <span className={styles.priceBandLabel}>{band.label}</span>
                  <span className={styles.priceBandArrow} aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 6. Breathing moment */}
        <section className={styles.breathingMoment}>
          <p className={styles.breathingText}>preloved is the move.</p>
        </section>

        {/* 7. Closing full-bleed section */}
        {/* Background: CSS url('/gradient-warm.jpg') in page.module.css — no img tag so no broken-image fallback */}
        {/* To add video later: uncomment the <video> inside .closingSection and set src="/closing.mp4" */}
        <section className={styles.closingSection}>
          {/* <video autoPlay muted loop playsInline src="" className={styles.closingBgVideo} aria-hidden="true" /> */}
          <div className={styles.closingOverlay} aria-hidden="true" />
          <div className={styles.closingContent}>
            <Link href="/browse" className={styles.closingCta}>
              Browse all listings
            </Link>
          </div>
        </section>

        </div>
      </main>

      {/* 8. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <nav aria-label="Footer" className={styles.footerLinks}>
            <a href="#" className={styles.footerLink}>How it works</a>
            <span className={styles.footerDot} aria-hidden="true">·</span>
            <a href="#" className={styles.footerLink}>Instagram</a>
            <span className={styles.footerDot} aria-hidden="true">·</span>
            <a href="#" className={styles.footerLink}>Contact</a>
          </nav>
          <p className={styles.footerCopyright}>© Reloved 2026</p>
        </div>
      </footer>
    </>
  );
}
