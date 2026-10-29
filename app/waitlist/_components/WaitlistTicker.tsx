import homeStyles from "@/app/page.module.css";
import styles from "../waitlist.module.css";
import HeartIcon from "./HeartIcon";

// The homepage hero's ticker tape, as a band of its own sitting on top of the
// form's photo, carrying the launch line instead of "a more circular way to
// shop". Same classes, so it moves and looks like the homepage's.

const TICKER_PHRASE = "launching across Pakistan soon";
const TICKER_REPEAT = 6;

export default function WaitlistTicker() {
  return (
    // Read once by a screen reader, not as a looping list of the same words.
    <div className={`${homeStyles.tickerTape} ${styles.tickerBand}`} role="note" aria-label={TICKER_PHRASE}>
      <div className={homeStyles.tickerTrack} aria-hidden="true">
        {[0, 1].map((group) => (
          <div key={group} className={homeStyles.tickerGroup}>
            {Array.from({ length: TICKER_REPEAT }).flatMap((_, i) => [
              <span key={`p-${i}`} className={`${homeStyles.tickerItem} ${styles.tickerText}`}>
                {TICKER_PHRASE}
              </span>,
              <span key={`h-${i}`} className={homeStyles.tickerHeart}>
                <HeartIcon />
              </span>,
            ])}
          </div>
        ))}
      </div>
    </div>
  );
}
