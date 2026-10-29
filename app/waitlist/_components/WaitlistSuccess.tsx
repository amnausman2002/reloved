"use client";

import { useEffect, useRef } from "react";
import { SHARE_MESSAGE, shareUrl, whatsappLink } from "../config";
import styles from "../waitlist.module.css";

// What replaces either form once she has joined. Focused when it appears, so
// a screen reader reads it out.
export default function WaitlistSuccess() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div ref={ref} tabIndex={-1} role="status" className={styles.success}>
      <p className={styles.successHeading}>You&rsquo;re in! We&rsquo;ll email you the moment we launch.</p>

      <div className={styles.successBlock}>
        <p className={styles.successText}>Know someone with a closet to clear?</p>
        <a
          className="btn-whatsapp"
          href={whatsappLink(`${SHARE_MESSAGE} ${shareUrl()}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
