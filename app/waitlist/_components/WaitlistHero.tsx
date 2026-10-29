import homeStyles from "@/app/page.module.css";
import styles from "../waitlist.module.css";
import HeroVideo from "./HeroVideo";
import JoinButton from "./JoinButton";

// A video hero with the words at the bottom left: a large heading, a small
// line under it, and one full-width button down to the form at the end of
// the page. The outlined button style is the homepage hero's own.

export default function WaitlistHero() {
  return (
    <section className={styles.hero}>
      <HeroVideo className={styles.heroVideo} />
      <div className={styles.heroShade} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div className={styles.heroIntro}>
          <h1 className={styles.heroTitle}>
            your next favourite outfit
            <br />
            is already out there.
          </h1>
          <p className={styles.heroSub}>
            Reloved is a new home for preloved women&rsquo;s fashion in Pakistan. Join the waitlist to
            get the first look.
          </p>
        </div>

        <JoinButton className={`${homeStyles.heroCta} ${styles.heroButton}`} />
      </div>
    </section>
  );
}
