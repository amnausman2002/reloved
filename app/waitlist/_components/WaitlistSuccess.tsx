"use client";

import { useEffect, useRef } from "react";
import { SHARE_MESSAGE, shareUrl, whatsappLink } from "../config";
import styles from "../waitlist.module.css";
import HeartIcon from "./HeartIcon";

// What replaces the form once she has joined. It pops into place with a few
// hearts, and is focused when it appears so a screen reader reads it out.
export default function WaitlistSuccess() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div ref={ref} tabIndex={-1} role="status" className={styles.success}>
      <p className={styles.successHeading}>
        You&rsquo;re in!
        {/* Three small hearts float up from beside the exclamation mark and
            fade: a moment of delight, once, then gone. */}
        <span className={styles.successHearts} aria-hidden="true">
          <HeartIcon size={14} className={styles.successHeart} />
          <HeartIcon size={10} className={styles.successHeart} />
          <HeartIcon size={12} className={styles.successHeart} />
        </span>
        <span className={styles.successSub}>We&rsquo;ll email you the moment we launch.</span>
      </p>

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
