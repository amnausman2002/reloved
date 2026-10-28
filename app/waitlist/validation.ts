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

export function phoneError(value: string): string | null {
  const national = normalisePhone(value);
  if (!national) return null;
  if (!NATIONAL_MOBILE_PATTERN.test(national)) {
    return "That doesn't look like a Pakistani mobile number. It should start with 3, like 300 1234567.";
  }
  return null;
}
