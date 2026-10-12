import Link from 'next/link';
import Nav from '@/components/ui/Nav';
import HeroSection from './_components/HeroSection';
import BuySellToggle from './_components/BuySellToggle';
import BrandGrid from './_components/BrandGrid';
import ClosingSection from './_components/ClosingSection';
import styles from './page.module.css';

const BRANDS: { name: string; slug: string; image?: string; logo?: string }[] = [
  { name: 'Khaadi', slug: 'khaadi', image: '/photos/brands/khaadi.png', logo: '/photos/brands/khaadi-logo.png' },
  { name: 'Sapphire', slug: 'sapphire', image: '/photos/brands/sapphire.png', logo: '/photos/brands/sapphire-logo.png' },
  { name: 'Generation', slug: 'generation', image: '/photos/brands/generation.png', logo: '/photos/brands/generation-logo.png' },
  { name: 'Lama', slug: 'lama', image: '/photos/brands/lama.png', logo: '/photos/brands/lama-logo.png' },
  { name: 'Outfitters', slug: 'outfitters', image: '/photos/brands/outfitters.png', logo: '/photos/brands/outfitters-logo.png' },
];

const CATEGORIES = [
  { name: 'Tops', slug: 'top', image: '/photos/categories/tops.png' },
  { name: 'Bottoms', slug: 'bottoms', image: '/photos/categories/bottoms.png' },
  { name: 'Dresses', slug: 'dress', image: '/photos/categories/dresses.png' },
  { name: 'Outerwear', slug: 'jacket', image: '/photos/categories/outerwear.png' },
  { name: 'Pret', slug: 'pret', image: '/photos/categories/pret.png' },
];

const PRICE_BANDS = [
  { label: 'Under PKR 3,000', max: 3000 },
  { label: 'Under PKR 5,000', max: 5000 },
  { label: 'Under PKR 10,000', max: 10000 },
];

export default function HomePage() {
  return (
    <>
      <Nav transparent />

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
            <BrandGrid brands={BRANDS} />
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.image} alt="" className={styles.categoryTilePhoto} />
                  </div>
                  <span className={styles.categoryTileLabel}>{cat.name}</span>
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

        {/* 6. Quote */}
        <section className={styles.quoteSection}>
          <div className={styles.container}>
            <p className={styles.quoteText}>
              Everything you want is already out there, sitting in{' '}
              <em>someone else&rsquo;s closet</em>. We&rsquo;re building the
              place where it finds its next owner, so clothes get a longer
              life and preloved feels <em>as good as new</em>.
            </p>
          </div>
        </section>

        </div>
      </main>

      {/* 7. Closing section: video background, footer pinned to the bottom */}
      <ClosingSection />
    </>
  );
}
