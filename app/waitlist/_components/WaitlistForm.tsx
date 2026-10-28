"use client";

import { useEffect, useId, useRef, useState } from "react";
import Input from "@/components/ui/Input";
import FilterChip from "@/components/ui/FilterChip";
import ChipRow from "@/components/ui/ChipRow";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { DIAL_CODE, formatNational, normalisePhone } from "@/app/sell/account";
import {
  INTENTS,
  INTENT_LABELS,
  emailError,
  isEmailValid,
  phoneError,
  type Intent,
} from "../validation";
import {
  FOUNDING_SELLER_MESSAGE,
  SHARE_MESSAGE,
  WAITLIST_WHATSAPP_NUMBER,
  shareUrl,
  whatsappLink,
} from "../config";
import { track, trackFormStart } from "../analytics";
import styles from "../waitlist.module.css";

/** Saved with every entry and sent to GA. The form only lives at the bottom
 *  now; the hero and the nav have buttons that bring her down to it. */
const FORM_LOCATION = "bottom";

type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};

export default function WaitlistForm() {
  const phoneId = useId();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [company, setCompany] = useState("");
  const [touched, setTouched] = useState({ email: false, phone: false });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedIntent, setSavedIntent] = useState<Intent | null>(null);

  const attribution = useRef<Attribution>({
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer: null,
  });
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    attribution.current = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
    };
  }, []);

  useEffect(() => {
    if (savedIntent) successRef.current?.focus();
  }, [savedIntent]);

  const visibleEmailError = touched.email ? emailError(email) : null;
  const visiblePhoneError = touched.phone ? phoneError(phone) : null;
  const valid = isEmailValid(email) && phoneError(phone) === null && intent !== null;

  function onFieldFocus() {
    trackFormStart(FORM_LOCATION);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving || !intent) return;

    setSaving(true);
    setSubmitError(null);
    const national = normalisePhone(phone);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: national || null,
          intent,
          form_location: FORM_LOCATION,
          company,
          ...attribution.current,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) throw new Error(`waitlist ${response.status}`);

      track("form_submit", { intent, has_phone: national !== "", form_location: FORM_LOCATION });
      setSavedIntent(intent);
    } catch {
      setSubmitError("Something went wrong on our side. Give it another go?");
    } finally {
      setSaving(false);
    }
  }

  if (savedIntent) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className={styles.success}>
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

        {savedIntent !== "buy" && (
          <p className={styles.successText}>
            Want to be a founding seller?{" "}
            <a
              className={styles.successLink}
              href={whatsappLink(FOUNDING_SELLER_MESSAGE, WAITLIST_WHATSAPP_NUMBER)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Message us on WhatsApp
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        error={visibleEmailError ?? undefined}
        onFocus={onFieldFocus}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
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
            className={visiblePhoneError ? "input input-error" : "input"}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="300 1234567"
            value={formatNational(phone)}
            aria-invalid={visiblePhoneError ? true : undefined}
            aria-describedby={`${phoneId}-hint${visiblePhoneError ? ` ${phoneId}-error` : ""}`}
            onFocus={onFieldFocus}
            onChange={(event) => setPhone(normalisePhone(event.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          />
        </div>
        <p className="input-hint" id={`${phoneId}-hint`}>
          So we can help you list faster. We&rsquo;ll never share it.
        </p>
        {visiblePhoneError && (
          <p className="input-error-msg" id={`${phoneId}-error`}>
            {visiblePhoneError}
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
              active={intent === value}
              onFocus={onFieldFocus}
              onClick={() => setIntent(value)}
            >
              {INTENT_LABELS[value]}
            </FilterChip>
          ))}
        </ChipRow>
      </div>

      {/* The honeypot. Off screen and out of the tab order, so only a bot
          filling every field it can find will put anything in it. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Company
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>

      {submitError && (
        <p className="input-error-msg" role="alert">
          {submitError}
        </p>
      )}

      <PrimaryButton
        type="submit"
        disabled={!valid}
        loading={saving}
        loadingLabel="Saving your spot..."
      >
        Join the waitlist
      </PrimaryButton>
    </form>
  );
}
