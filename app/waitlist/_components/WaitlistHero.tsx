import homeStyles from "@/app/page.module.css";
import styles from "../waitlist.module.css";
import WaitlistForm from "./WaitlistForm";

// The homepage hero (app/_components/HeroSection.tsx) with the search bar and
// "Browse all" swapped for the waitlist form. Same classes from
// app/page.module.css, so a change to the homepage hero's look carries over.

const TICKER_PHRASE = "a more circular way to shop";
const TICKER_REPEAT = 6;

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M4.0238 1.08512c0.98053 0.07105 2.00224 0.54903 2.98028 1.5164 0.97779 -0.9671 1.9986 -1.44417 2.97822 -1.51364 1.1056 -0.07841 2.083 0.36844 2.7902 1.07345 1.3903 1.38614 1.8269 3.89436 0.1017 5.6196 -0.0058 0.00582 -0.0118 0.0115 -0.0179 0.01702L7.33974 12.7949c-0.19051 0.1725 -0.48082 0.1725 -0.67133 0L1.15183 7.79795c-0.0061 -0.00552 -0.01206 -0.0112 -0.01788 -0.01702 -1.73423 -1.73423 -1.299958 -4.24274 0.09494 -5.6278 0.70889 -0.7039 1.68828 -1.14819 2.79491 -1.06801Z"
      />
    </svg>
  );
}

export default function WaitlistHero({ emailInputId }: { emailInputId: string }) {
  return (
    <section className={`${homeStyles.hero} ${styles.hero}`}>
      <div className={homeStyles.heroOverlay} aria-hidden="true" />

      <div className={homeStyles.heroContent}>
        <div className={homeStyles.heroIntro}>
          <h1 className={homeStyles.heroHeadline}>
            great style doesn&rsquo;t have to cost full price.
          </h1>
          <p className={homeStyles.heroSubheading}>
            Buy and sell preloved women&rsquo;s fashion in Pakistan
          </p>
        </div>

        <div className={styles.heroForm}>
          <WaitlistForm location="hero" emailInputId={emailInputId} />
          <p className={styles.heroNote}>Launching across Pakistan soon.</p>
        </div>
      </div>

      <div className={homeStyles.tickerTape} aria-hidden="true">
        <div className={homeStyles.tickerTrack}>
          {[0, 1].map((group) => (
            <div key={group} className={homeStyles.tickerGroup}>
              {Array.from({ length: TICKER_REPEAT }).flatMap((_, i) => [
                <span key={`p-${i}`} className={homeStyles.tickerItem}>{TICKER_PHRASE}</span>,
                <span key={`h-${i}`} className={homeStyles.tickerHeart}>
                  <HeartIcon />
                </span>,
              ])}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
