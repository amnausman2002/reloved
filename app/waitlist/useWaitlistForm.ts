"use client";

import { useEffect, useRef, useState } from "react";
import { emailError, isEmailValid, nationalDigits, phoneError, type Intent } from "./validation";
import { PAKISTAN, type Country } from "./countries";
import { track, trackFormStart } from "./analytics";

// The waitlist form's state, its checks, and the save, kept apart from how
// the form looks.

/** Saved with every entry and sent to GA. There is one form now, at the end
 *  of the page; the field stays so a second placement can be told apart. */
const FORM_LOCATION = "bottom";

type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};

export function useWaitlistForm() {
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<Country>(PAKISTAN);
  /** Digits only, without the country code. */
  const [phone, setPhoneRaw] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [company, setCompany] = useState("");
  // Errors are only ever set when she leaves a field, and cleared the moment
  // she types in it again, so nothing is flagged while she is still typing.
  const [shownEmailError, setShownEmailError] = useState<string | null>(null);
  const [shownPhoneError, setShownPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  /** What she chose, as saved. Null if she skipped "I want to". */
  const [savedIntent, setSavedIntent] = useState<Intent | null>(null);

  const attribution = useRef<Attribution>({
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    attribution.current = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
    };
  }, []);

  /** The WhatsApp field is only offered to sellers: Sell, or Buy and sell. */
  const asksForPhone = intent === "sell" || intent === "both";
  /** What is actually sent. A number typed before switching to Buy stays in
   *  the field, in case she switches back, but is not saved. */
  const sentPhone = asksForPhone ? phone : "";

  // Only the email is required. A number, if she gives one, has to look real.
  const valid = isEmailValid(email) && phoneError(sentPhone, country.code) === null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    setSubmitError(null);

    // A save that has not answered in 20 seconds is treated as failed, so she
    // is never left on "Saving your spot..." with no way on. Trying again is
    // always safe: a second save of the same email updates the first.
    const timeout = AbortSignal.timeout(20_000);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        signal: timeout,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          country_code: country.code,
          phone: sentPhone || null,
          intent,
          form_location: FORM_LOCATION,
          company,
          ...attribution.current,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) throw new Error(`waitlist ${response.status}`);

      track("form_submit", { intent: intent ?? "none", has_phone: sentPhone !== "", form_location: FORM_LOCATION });
      setSavedIntent(intent);
      setSaved(true);
    } catch {
      setSubmitError("Something went wrong on our side. Give it another go?");
    } finally {
      setSaving(false);
    }
  }

  return {
    email,
    setEmail: (value: string) => {
      setEmail(value);
      setShownEmailError(null);
    },
    country,
    /** A new country re-reads the digits already typed under its own rules;
     *  any error waits until she leaves the number field again. */
    setCountry: (next: Country) => {
      setCountry(next);
      setPhoneRaw((current) => nationalDigits(current, next.code));
      setShownPhoneError(null);
    },
    phone,
    /** Takes the field as typed and keeps only the national digits. */
    setPhone: (value: string) => {
      setPhoneRaw(nationalDigits(value, country.code));
      setShownPhoneError(null);
    },
    intent,
    setIntent,
    company,
    setCompany,
    touchEmail: () => setShownEmailError(emailError(email)),
    touchPhone: () => setShownPhoneError(phoneError(phone, country.code)),
    emailError: shownEmailError,
    phoneError: asksForPhone ? shownPhoneError : null,
    asksForPhone,
    valid,
    saving,
    submitError,
    saved,
    savedIntent,
    onFieldFocus: () => trackFormStart(FORM_LOCATION),
    onSubmit,
  };
}
