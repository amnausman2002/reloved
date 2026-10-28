"use client";

import { useEffect, useRef, useState } from "react";
import { normalisePhone } from "@/app/sell/account";
import { emailError, isEmailValid, phoneError, type Intent } from "./validation";
import { track, trackFormStart } from "./analytics";

// Everything the two waitlist forms share: their state, the checks, and the
// save. The hero form and the bottom form differ only in how they look.

export type FormLocation = "hero" | "bottom";

type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};

export function useWaitlistForm(location: FormLocation) {
  const [email, setEmail] = useState("");
  const [phone, setPhoneRaw] = useState("");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    attribution.current = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
    };
  }, []);

  const valid = isEmailValid(email) && phoneError(phone) === null && intent !== null;

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
          form_location: location,
          company,
          ...attribution.current,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) throw new Error(`waitlist ${response.status}`);

      track("form_submit", { intent, has_phone: national !== "", form_location: location });
      setSavedIntent(intent);
    } catch {
      setSubmitError("Something went wrong on our side. Give it another go?");
    } finally {
      setSaving(false);
    }
  }

  return {
    email,
    setEmail,
    phone,
    /** Takes the field as typed and keeps only the national digits. */
    setPhone: (value: string) => setPhoneRaw(normalisePhone(value)),
    intent,
    setIntent,
    company,
    setCompany,
    touchEmail: () => setTouched((t) => ({ ...t, email: true })),
    touchPhone: () => setTouched((t) => ({ ...t, phone: true })),
    emailError: touched.email ? emailError(email) : null,
    phoneError: touched.phone ? phoneError(phone) : null,
    valid,
    saving,
    submitError,
    savedIntent,
    onFieldFocus: () => trackFormStart(location),
    onSubmit,
  };
}
