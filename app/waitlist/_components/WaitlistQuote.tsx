"use client";

import { useEffect, useRef } from "react";
import homeStyles from "@/app/page.module.css";
import styles from "../waitlist.module.css";

// The mission paragraph, in the homepage's quote style (app/_components/QuoteSection.tsx), but
// revealed by scrolling instead of on a timer: each word fades from faint to
// full as she scrolls the paragraph up the screen, and stays full after. The
// text is never invisible, so there is no blank gap while it plays.
//
// Scroll only updates one number, --p, on the paragraph. Each word works out
// its own opacity from that and its position in CSS (see .quoteWord).

type Segment = { text: string; italic: boolean };

const SEGMENTS: Segment[] = [
  {
    text: "We saw wardrobes full of clothes worn once, and buyers who’d love them, with nothing good in between. Reloved is the place where clothes get a longer life and preloved feels ",
    italic: false,
  },
  { text: "as good as new", italic: true },
  { text: ".", italic: false },
];

/** Words with their italics, in reading order. A leading "." stays attached to
 *  the word before it rather than counting as a word of its own. */
const WORDS = SEGMENTS.flatMap((segment) =>
  segment.text
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, italic: segment.italic, space: /^\s+$/.test(part) })),
);
const WORD_COUNT = WORDS.filter((word) => !word.space).length;

/** Fully revealed by the time the paragraph's bottom edge reaches this far
 *  down the screen, having started when its top edge came in at START. */
const START = 0.9;
const END = 0.6;

export default function WaitlistQuote() {
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "1");
      return;
    }

    let frame = 0;
    // Only ever goes up: scrolling back never fades a word that has already
    // filled in. A reload starts it again.
    let furthest = 0;
    function update() {
      frame = 0;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const travelled = vh * START - rect.top;
      const distance = vh * (START - END) + rect.height;
      const progress = Math.min(1, Math.max(0, travelled / distance));
      if (progress <= furthest) return;
      furthest = progress;
      el.style.setProperty("--p", progress.toFixed(4));
      if (furthest === 1) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  let index = 0;

  return (
    <section className={homeStyles.quoteSection}>
      <div className={homeStyles.container}>
        <p className={styles.eyebrow}>Our mission</p>
        <p
          ref={textRef}
          className={`${homeStyles.quoteText} ${styles.quoteScroll}`}
          style={{ "--n": WORD_COUNT } as React.CSSProperties}
        >
          {WORDS.map((word, i) => {
            if (word.space) return word.text;
            const style = { "--i": index++ } as React.CSSProperties;
            return word.italic ? (
              <em key={i} className={styles.quoteWord} style={style}>
                {word.text}
              </em>
            ) : (
              <span key={i} className={styles.quoteWord} style={style}>
                {word.text}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
