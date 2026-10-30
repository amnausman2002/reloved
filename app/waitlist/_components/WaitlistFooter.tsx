import { CONTACT_EMAIL, INSTAGRAM_URL, WAITLIST_WHATSAPP_NUMBER } from "../config";
import styles from "../waitlist.module.css";

export default function WaitlistFooter() {
  return (
    <footer className={styles.footer}>
      <span className={`nav-wordmark ${styles.footerWordmark}`}>reloved.</span>
      <div className={styles.footerLinks}>
        <a className={styles.footerLink} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        <a className={styles.footerLink} href={`mailto:${CONTACT_EMAIL}`}>
          Email
        </a>
        <a
          className={styles.footerLink}
          href={`https://wa.me/${WAITLIST_WHATSAPP_NUMBER.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>
    </footer>
  );
}
