"use client";

import { useId } from "react";
import FilterChip from "@/components/ui/FilterChip";
import ChipRow from "@/components/ui/ChipRow";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { DIAL_CODE, formatNational } from "@/app/sell/account";
import { INTENTS, INTENT_LABELS } from "../validation";
import { useWaitlistForm } from "../useWaitlistForm";
import WaitlistSuccess from "./WaitlistSuccess";
import Honeypot from "./Honeypot";
import styles from "../waitlist.module.css";

// The waitlist form, in the frosted panel at the end of the page. Email and
// WhatsApp are bare underlined lines labelled in Fraunces; Buy / Sell / Both
// are the design system's chips; the button is the hero's outlined one, in
// dark for the light panel.
export default function WaitlistForm() {
  const form = useWaitlistForm("bottom");
  const phoneId = useId();
  const emailErrorId = useId();

  if (form.savedIntent) return <WaitlistSuccess intent={form.savedIntent} />;

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

      <div>
        <p className={styles.lineLabel} aria-hidden="true">
          I want to
        </p>
        <ChipRow label="I want to">
          {INTENTS.map((value) => (
            <FilterChip
              key={value}
              active={form.intent === value}
              onFocus={form.onFieldFocus}
              onClick={() => form.setIntent(value)}
            >
              {INTENT_LABELS[value]}
            </FilterChip>
          ))}
        </ChipRow>
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
        Join the waitlist
      </PrimaryButton>
    </form>
  );
}
