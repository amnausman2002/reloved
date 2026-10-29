"use client";

import { useEffect, useId, useRef, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { formatNational } from "@/app/sell/account";
import { INTENT_LABELS, type Intent } from "../validation";
import { useWaitlistForm } from "../useWaitlistForm";
import WaitlistSuccess from "./WaitlistSuccess";
import Honeypot from "./Honeypot";
import CountryCodePicker from "./CountryCodePicker";
import styles from "../waitlist.module.css";

// The waitlist form, in the panel at the end of the page: the email, then
// "I'm here to" with Buy / Sell / Both beside it, then, only for sellers, the
// founding-seller invitation and the WhatsApp line. The button is the hero's
// outlined one.

const SINGLE_CHOICES: Intent[] = ["buy", "sell", "both"];

type Props = {
  /** Called once she has joined, so the panel can swap its heading for the
   *  success message. */
  onSaved: () => void;
};

export default function WaitlistForm({ onSaved }: Props) {
  const form = useWaitlistForm();
  const phoneId = useId();
  const emailErrorId = useId();
  const phoneRef = useRef<HTMLInputElement>(null);
  // The fold clips its contents while it opens. Once open, the country list
  // has to be able to spill out of it, upwards over the line above.
  const [foldSettled, setFoldSettled] = useState(false);
  useEffect(() => {
    if (!form.asksForPhone) {
      setFoldSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setFoldSettled(true), 450);
    return () => window.clearTimeout(timer);
  }, [form.asksForPhone]);

  useEffect(() => {
    if (form.saved) onSaved();
  }, [form.saved, onSaved]);

  if (form.saved) return <WaitlistSuccess />;

  /** Tapping the chosen word again clears it. */
  function choose(value: Intent) {
    form.setIntent(form.intent === value ? null : value);
    form.onFieldFocus();
  }

  return (
    <form className={styles.lineForm} onSubmit={form.onSubmit} noValidate>
      <div>
        <div className={[styles.lineField, form.emailError && styles.lineFieldError].filter(Boolean).join(" ")}>
          <input
            className={styles.lineInput}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Email"
            aria-label="Your email"
            aria-invalid={form.emailError ? true : undefined}
            aria-describedby={form.emailError ? emailErrorId : undefined}
            value={form.email}
            onFocus={form.onFieldFocus}
            onChange={(event) => form.setEmail(event.target.value)}
            onBlur={form.touchEmail}
          />
        </div>
        {form.emailError && (
          <p className={styles.lineError} id={emailErrorId}>
            {form.emailError}
          </p>
        )}
      </div>

      {/* Choosing Both folds the three words into one, "Buy and sell";
          tapping that clears it and brings the three back. */}
      <div className={styles.intentRow} role="group" aria-label="I’m here to">
        <span className={styles.intentLabel} aria-hidden="true">
          I&rsquo;m here to
        </span>
        <div className={styles.intentChoices}>
          {form.intent === "both" ? (
            <button
              type="button"
              aria-pressed="true"
              className={`${styles.intentChoice} ${styles.intentChoiceActive}`}
              onClick={() => choose("both")}
            >
              Buy and sell
            </button>
          ) : (
            SINGLE_CHOICES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={form.intent === value}
                className={[styles.intentChoice, form.intent === value && styles.intentChoiceActive]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => choose(value)}
              >
                {INTENT_LABELS[value]}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Only for sellers: opens when she picks Sell or Buy and sell. */}
      <div
        className={[styles.fold, form.asksForPhone && styles.foldOpen, foldSettled && styles.foldSettled]
          .filter(Boolean)
          .join(" ")}
        inert={!form.asksForPhone}
      >
        <div className={styles.foldClip}>
          <div className={styles.foldBody}>
            <p className={styles.foundingIntro} id={`${phoneId}-intro`}>
              Want to be a founding seller?
              <br />
              The first 30 get personal help listing and go live on launch day. Drop your WhatsApp and
              we&rsquo;ll set you up.
            </p>
            <div>
              <div className={[styles.lineField, form.phoneError && styles.lineFieldError].filter(Boolean).join(" ")}>
                <CountryCodePicker
                  value={form.country}
                  onChange={form.setCountry}
                  onPicked={() => phoneRef.current?.focus()}
                />
                <input
                  ref={phoneRef}
                  id={phoneId}
                  className={styles.lineInput}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="WhatsApp number (optional)"
                  aria-label="WhatsApp number (optional)"
                  aria-invalid={form.phoneError ? true : undefined}
                  aria-describedby={`${phoneId}-intro${form.phoneError ? ` ${phoneId}-error` : ""}`}
                  value={form.country.code === "92" ? formatNational(form.phone) : form.phone}
                  onFocus={form.onFieldFocus}
                  onChange={(event) => form.setPhone(event.target.value)}
                  onBlur={(event) => {
                    // Going to the country code is still working on the number.
                    const line = event.currentTarget.parentElement;
                    if (!line?.contains(event.relatedTarget as Node | null)) form.touchPhone();
                  }}
                />
              </div>
              {form.phoneError && (
                <p className={styles.lineError} id={`${phoneId}-error`}>
                  {form.phoneError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Honeypot value={form.company} onChange={form.setCompany} />

      {form.submitError && (
        <p className={styles.lineError} role="alert">
          {form.submitError}
        </p>
      )}

      <PrimaryButton
        type="submit"
        className={styles.panelSubmit}
        disabled={!form.valid}
        loading={form.saving}
        loadingLabel="Saving your spot..."
      >
        Save my spot
      </PrimaryButton>
    </form>
  );
}
