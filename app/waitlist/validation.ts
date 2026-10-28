// The waitlist form's rules, shared by the form and the API route so the two
// can never disagree about what counts as valid.

import { normalisePhone } from "@/app/sell/account";

export const INTENTS = ["buy", "sell", "both"] as const;
export type Intent = (typeof INTENTS)[number];

export const INTENT_LABELS: Record<Intent, string> = {
  buy: "Buy",
  sell: "Sell",
  both: "Both",
};

/** Catches typos, which is all an email pattern can honestly do. Same pattern
 *  as the account step in app/sell/account.ts. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A Pakistani mobile without the +92: ten digits starting with 3. */
export const NATIONAL_MOBILE_PATTERN = /^3\d{9}$/;

export function isEmailValid(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** The error to show, or null. Empty shows nothing: the button stays disabled
 *  until it is filled, which says enough without scolding her for a field she
 *  has not reached yet. */
export function emailError(value: string): string | null {
  const email = value.trim();
  if (!email || EMAIL_PATTERN.test(email)) return null;
  return "That email looks a little off. Mind checking it?";
}

/** The number without its country code, digits only. Pakistan's habits (a
 *  leading 0, or 92 typed again) are handled by the sell flow's own rule;
 *  elsewhere a leading 0 is the local trunk prefix and is dropped. */
export function nationalDigits(value: string, countryCode: string): string {
  if (countryCode === "92") return normalisePhone(value);
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

/** Pakistan: a mobile, 10 digits starting with 3. Anywhere else: a plausible
 *  length, since an international number can be at most 15 digits in all. */
export function phoneError(national: string, countryCode: string): string | null {
  if (!national) return null;
  if (countryCode === "92") {
    if (NATIONAL_MOBILE_PATTERN.test(national)) return null;
    return "That doesn't look like a Pakistani mobile number. It should start with 3, like 300 1234567.";
  }
  if (national.length >= 4 && countryCode.length + national.length <= 15) return null;
  return "That number doesn't look quite right. Mind checking it?";
}
