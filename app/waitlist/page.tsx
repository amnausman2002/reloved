import homeStyles from "@/app/page.module.css";
import QuoteSection from "@/app/_components/QuoteSection";
import WaitlistNav from "./_components/WaitlistNav";
import WaitlistHero from "./_components/WaitlistHero";
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
          <WaitlistBuySellToggle />

          {/* The mission paragraph: the homepage's own component, with the
              same letter-by-letter reveal. */}
          <QuoteSection />

          <section id={JOIN_SECTION_ID} className={`${homeStyles.section} ${styles.joinSection}`}>
            <div className={styles.joinInner}>
              <h2 id={JOIN_HEADING_ID} tabIndex={-1} className={`text-h1 ${styles.joinHeading}`}>
                Get in early.
              </h2>
              <p className={styles.joinSub}>Be first to shop, or be one of our founding sellers.</p>
              <WaitlistForm />
            </div>
          </section>
        </div>
      </main>

      <WaitlistFooter />
    </>
  );
}
