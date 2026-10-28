import homeStyles from "@/app/page.module.css";
import QuoteSection from "@/app/_components/QuoteSection";
import WaitlistNav from "./_components/WaitlistNav";
import WaitlistHero from "./_components/WaitlistHero";
import WaitlistBuySellToggle from "./_components/WaitlistBuySellToggle";
import WaitlistForm from "./_components/WaitlistForm";
import WaitlistFooter from "./_components/WaitlistFooter";
import styles from "./waitlist.module.css";

// The smoke-test landing page, 30 Oct to 10 Nov. Self-contained on purpose:
// nothing here links into the app, because every link out is a visitor who
// did not join. Built from the homepage's sections; the homepage itself is
// untouched.

const HERO_EMAIL_ID = "waitlist-hero-email";

export default function WaitlistPage() {
  return (
    <>
      <WaitlistNav emailInputId={HERO_EMAIL_ID} />

      <main>
        <WaitlistHero emailInputId={HERO_EMAIL_ID} />

        <div className={homeStyles.pageScroll}>
          <WaitlistBuySellToggle />

          {/* The mission paragraph, the homepage's own component. */}
          <QuoteSection />

          <section className={`${homeStyles.section} ${styles.joinSection}`}>
            <div className={styles.joinInner}>
              <h2 className="text-h1">Get in early.</h2>
              <p className={styles.joinSub}>Be first to shop, or be one of our founding sellers.</p>
              <WaitlistForm location="bottom" />
            </div>
          </section>
        </div>
      </main>

      <WaitlistFooter />
    </>
  );
}
