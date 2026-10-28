import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../config";
import styles from "../waitlist.module.css";

export default function WaitlistFooter() {
  return (
    <footer className={styles.footer}>
      <a className={styles.footerLink} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
        @{INSTAGRAM_HANDLE}
      </a>
      <a className={styles.footerLink} href={`mailto:${CONTACT_EMAIL}`}>
        {CONTACT_EMAIL}
      </a>
    </footer>
  );
}
