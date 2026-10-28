"use client";

import { useEffect, useId, useRef, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { DIAL_CODE, formatNational } from "@/app/sell/account";
import { INTENTS, INTENT_LABELS } from "../validation";
import { useWaitlistForm } from "../useWaitlistForm";
import WaitlistSuccess from "./WaitlistSuccess";
import Honeypot from "./Honeypot";
import styles from "../waitlist.module.css";

// The hero's form. Deliberately outside the design system: bare underlined
// lines on the video, no boxes or fills. Starts as just the email line; once
// she taps into it the rest of the form opens beneath, which pushes the
// heading up, and the hero tells the video to darken (onOpenChange).

type Props = {
  onOpenChange: (open: boolean) => void;
};

export default function HeroWaitlistForm({ onOpenChange }: Props) {
  const form = useWaitlistForm("hero");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const phoneId = useId();
  const emailErrorId = useId();

  // Read inside the delayed blur check, which would otherwise see the values
  // from when the timer was set.
  const filled = useRef(false);
  filled.current = Boolean(form.email.trim() || form.phone || form.intent);

  useEffect(() => {
    onOpenChange(open || Boolean(form.savedIntent));
  }, [open, form.savedIntent, onOpenChange]);

  function openForm() {
    setOpen(true);
    form.onFieldFocus();
  }

  // Folds back only if she leaves without having started. The short wait lets
  // a tap on Buy / Sell / Both land first: Safari does not focus a tapped
  // button, so to the browser that tap looks like leaving the form.
  function onBlur() {
    window.setTimeout(() => {
      const inside = formRef.current?.contains(document.activeElement);
      if (!inside && !filled.current) setOpen(false);
    }, 200);
  }

  if (form.savedIntent) return <WaitlistSuccess intent={form.savedIntent} onDark />;

  return (
    <form ref={formRef} className={styles.lineFormOuter} onSubmit={form.onSubmit} onBlur={onBlur} noValidate>
      <div>
        <div className={[styles.lineField, form.emailError && styles.lineFieldError].filter(Boolean).join(" ")}>
          <input
            className={styles.lineInput}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="your email"
            aria-label="Your email"
            aria-invalid={form.emailError ? true : undefined}
            aria-describedby={form.emailError ? emailErrorId : undefined}
            value={form.email}
            onFocus={openForm}
            onChange={(event) => {
              form.setEmail(event.target.value);
              setOpen(true);
            }}
            onBlur={form.touchEmail}
          />
        </div>
        {form.emailError && (
          <p className={styles.lineError} id={emailErrorId}>
            {form.emailError}
          </p>
        )}
      </div>

      <div className={[styles.expand, open && styles.expandOpen].filter(Boolean).join(" ")} inert={!open}>
        <div className={styles.expandClip}>
          <div className={`${styles.lineForm} ${styles.expandBody}`}>
            <div>
              <div className={[styles.lineField, form.phoneError && styles.lineFieldError].filter(Boolean).join(" ")}>
                <span className={styles.linePrefix} aria-hidden="true">
                  {DIAL_CODE}
                </span>
                <input
                  id={phoneId}
                  className={styles.lineInput}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="WhatsApp number (optional)"
                  aria-label="WhatsApp number (optional)"
                  aria-invalid={form.phoneError ? true : undefined}
                  aria-describedby={`${phoneId}-hint${form.phoneError ? ` ${phoneId}-error` : ""}`}
                  value={formatNational(form.phone)}
                  onFocus={form.onFieldFocus}
                  onChange={(event) => form.setPhone(event.target.value)}
                  onBlur={form.touchPhone}
                />
              </div>
              <p className={styles.lineHint} id={`${phoneId}-hint`}>
                So we can help you list faster. We&rsquo;ll never share it.
              </p>
              {form.phoneError && (
                <p className={styles.lineError} id={`${phoneId}-error`}>
                  {form.phoneError}
                </p>
              )}
            </div>

            <div className={styles.lineChoices} role="group" aria-label="I want to">
              <span className={styles.lineChoicesLabel} aria-hidden="true">
                I want to
              </span>
              {INTENTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.intent === value}
                  className={[styles.lineChoice, form.intent === value && styles.lineChoiceActive]
                    .filter(Boolean)
                    .join(" ")}
                  onFocus={form.onFieldFocus}
                  onClick={() => form.setIntent(value)}
                >
                  {INTENT_LABELS[value]}
                </button>
              ))}
            </div>

            <Honeypot value={form.company} onChange={form.setCompany} />

            {form.submitError && (
              <p className={styles.lineError} role="alert">
                {form.submitError}
              </p>
            )}

            <PrimaryButton
              type="submit"
              className={styles.lineSubmit}
              disabled={!form.valid}
              loading={form.saving}
              loadingLabel="Saving your spot..."
            >
              Join the waitlist
            </PrimaryButton>
          </div>
        </div>
      </div>
    </form>
  );
}
