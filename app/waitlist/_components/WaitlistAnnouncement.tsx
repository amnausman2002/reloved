import styles from "../waitlist.module.css";

// A thin, still bar straight after the hero, after the announcement bar at
// the top of kindredofireland.com. The hero is shortened by this bar's height
// so the bar just shows at the bottom of the first screen.
export default function WaitlistAnnouncement() {
  return (
    <div className={styles.announce}>
      <p className={styles.announceText}>Launching across Pakistan soon.</p>
    </div>
  );
}
