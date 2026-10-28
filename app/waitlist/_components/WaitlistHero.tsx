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
          <h1 className={styles.heroTitle}>great style doesn&rsquo;t have to cost full price.</h1>
          <p className={styles.heroSub}>Buy and sell preloved women&rsquo;s fashion.</p>
        </div>

        <JoinButton className={`${homeStyles.heroCta} ${styles.heroButton}`} />
      </div>
    </section>
  );
}
