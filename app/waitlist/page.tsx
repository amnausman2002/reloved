import homeStyles from "@/app/page.module.css";
import WaitlistNav from "./_components/WaitlistNav";
import WaitlistHero from "./_components/WaitlistHero";
import WaitlistBuySellToggle from "./_components/WaitlistBuySellToggle";
import WaitlistQuote from "./_components/WaitlistQuote";
import WaitlistTicker from "./_components/WaitlistTicker";
import WaitlistJoin from "./_components/WaitlistJoin";
import WaitlistFooter from "./_components/WaitlistFooter";

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
          <WaitlistTicker />
          <WaitlistQuote />
          {/* The form: where both "Join the waitlist" buttons bring her. */}
          <WaitlistJoin />
        </div>
      </main>

      <WaitlistFooter />
    </>
  );
}
