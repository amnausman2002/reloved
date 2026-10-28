import homeStyles from "@/app/page.module.css";
import WaitlistNav from "./_components/WaitlistNav";
import WaitlistHero from "./_components/WaitlistHero";
import WaitlistQuote from "./_components/WaitlistQuote";
import WaitlistTicker from "./_components/WaitlistTicker";
import WaitlistBuySellToggle from "./_components/WaitlistBuySellToggle";
import WaitlistJoin from "./_components/WaitlistJoin";

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
          {/* The form and the contact links: where both "Join the waitlist"
              buttons bring her, and the end of the page. */}
          <WaitlistJoin />
        </div>
      </main>
    </>
  );
}
