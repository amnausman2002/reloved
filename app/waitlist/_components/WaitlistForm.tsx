"use client";

import { useId } from "react";
import Input from "@/components/ui/Input";
import FilterChip from "@/components/ui/FilterChip";
import ChipRow from "@/components/ui/ChipRow";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { DIAL_CODE, formatNational } from "@/app/sell/account";
import { INTENTS, INTENT_LABELS } from "../validation";
import { useWaitlistForm } from "../useWaitlistForm";
import WaitlistSuccess from "./WaitlistSuccess";
import Honeypot from "./Honeypot";
import styles from "../waitlist.module.css";

// The form at the bottom of the page, built from the design system's fields.
export default function WaitlistForm() {
  const phoneId = useId();
  const form = useWaitlistForm("bottom");

  if (form.savedIntent) return <WaitlistSuccess intent={form.savedIntent} />;

  return (
    <form className={styles.form} onSubmit={form.onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={form.email}
        error={form.emailError ?? undefined}
        onFocus={form.onFieldFocus}
        onChange={(event) => form.setEmail(event.target.value)}
        onBlur={form.touchEmail}
      />

      <div>
        <label className="input-label" htmlFor={phoneId}>
          WhatsApp number <span className={styles.optional}>(optional)</span>
        </label>
        <div className="input-with-prefix">
          <span className="input-prefix" aria-hidden="true">
            {DIAL_CODE}
          </span>
          <input
            id={phoneId}
            className={form.phoneError ? "input input-error" : "input"}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="300 1234567"
            value={formatNational(form.phone)}
            aria-invalid={form.phoneError ? true : undefined}
            aria-describedby={`${phoneId}-hint${form.phoneError ? ` ${phoneId}-error` : ""}`}
            onFocus={form.onFieldFocus}
            onChange={(event) => form.setPhone(event.target.value)}
            onBlur={form.touchPhone}
          />
        </div>
        <p className="input-hint" id={`${phoneId}-hint`}>
          So we can help you list faster. We&rsquo;ll never share it.
        </p>
        {form.phoneError && (
          <p className="input-error-msg" id={`${phoneId}-error`}>
            {form.phoneError}
          </p>
        )}
      </div>

      <div>
        <p className="input-label" aria-hidden="true">
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
        <p className="input-error-msg" role="alert">
          {form.submitError}
        </p>
      )}

      <PrimaryButton
        type="submit"
        disabled={!form.valid}
        loading={form.saving}
        loadingLabel="Saving your spot..."
      >
        Join the waitlist
      </PrimaryButton>
    </form>
  );
}
