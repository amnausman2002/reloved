import homeStyles from "@/app/page.module.css";
import HeroVideo from "./_components/HeroVideo";
import WaitlistNav from "./_components/WaitlistNav";
import WaitlistHero from "./_components/WaitlistHero";
import WaitlistQuote from "./_components/WaitlistQuote";
import WaitlistTicker from "./_components/WaitlistTicker";
import WaitlistBuySellToggle from "./_components/WaitlistBuySellToggle";
import WaitlistForm from "./_components/WaitlistForm";
import WaitlistFooter from "./_components/WaitlistFooter";
import { JOIN_HEADING_ID, JOIN_SECTION_ID } from "./_components/JoinButton";
import styles from "./waitlist.module.css";

// The smoke-test landing page, 30 Oct to 10 Nov. Self-contained on purpose:
// nothing here links into the app, because every link out is a visitor who
// did not join. Built from the homepage's sections; the homepage itself is
// untouched.

export default function WaitlistPage() {
  return (
    <>
      <WaitlistNav />

      <main>
        <WaitlistHero />

        <div className={homeStyles.pageScroll}>
          <WaitlistQuote />
          <WaitlistTicker />

          <WaitlistBuySellToggle />

          {/* The form, over the same video as the hero but darkened, so it
              reads as the page's other bookend. Where both "Join the
              waitlist" buttons bring her. */}
          <section id={JOIN_SECTION_ID} className={`${styles.hero} ${styles.joinSection}`}>
            <HeroVideo className={styles.heroVideo} lazy />
            <div className={`${styles.heroShade} ${styles.heroShadeDeep}`} aria-hidden="true" />

            <div className={styles.heroInner}>
              <div className={styles.heroIntro}>
                <h2 id={JOIN_HEADING_ID} tabIndex={-1} className={`${styles.heroTitle} ${styles.joinHeading}`}>
                  Get in early.
                </h2>
                <p className={styles.heroSub}>Be first to shop, or be one of our founding sellers.</p>
              </div>
              <WaitlistForm />
            </div>
          </section>
        </div>
      </main>

      <WaitlistFooter />
    </>
  );
}
