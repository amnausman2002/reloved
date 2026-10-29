import HeartIcon from "./HeartIcon";
import styles from "../waitlist.module.css";

// The page's opening, about 2.4 seconds: a dark heart alone on the canvas,
// then a dive into it until the screen is dark, then the dark lifts and the
// hero is there underneath, its video already playing.
//
// Pure CSS, and part of the page's first HTML, so it covers the page from the
// very first frame, before any script has loaded. It ends invisible and
// click-through on its own. Skipped entirely for anyone who has asked for
// less motion.
export default function WaitlistIntro() {
  return (
    <div className={styles.intro} aria-hidden="true">
      <HeartIcon size={48} className={styles.introHeart} />
    </div>
  );
}
