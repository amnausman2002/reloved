// Everything the account step knows that is not a React component.
//
// NEW, 9 Oct. This is email + password, not the email link sign-in described in
// CLAUDE.md and the PRD. Amna and Bismah agreed the account section of the PRD
// is being revisited, so the written plan is deliberately not being followed
// here. Nothing below talks to Firebase yet: the whole step is local state.
//
// Three steps, in this order:
//   identity   full name, email, password, confirm password
//   phone      the WhatsApp number
//   code       the SMS code
//
// Split that way because the phone number is the one piece that can fail on us
// (no signal, wrong number, SMS provider down), and it should fail on its own
// screen rather than taking a long form down with it.

export type AccountFields = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** National part only, no country code. `toE164` adds it. */
  phone: string;
};

export const EMPTY_ACCOUNT: AccountFields = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
};

/** Firebase sends six digits. The 4 digit PIN on the reference screenshot is
 *  SendPK's own format and is not something we can choose. */
export const OTP_LENGTH = 6;

/** Pakistan. Hard-coded on purpose: the north star is a woman anywhere in
 *  Pakistan, and a country picker is a dropdown of 200 wrong answers. */
export const DIAL_CODE = "+92";

/** Deliberately low. The usual "8 characters, a number and a symbol" rule
 *  pushes people towards one password they reuse everywhere, and we are not
 *  guarding a bank. Firebase itself rejects anything under 6. */
export const MIN_PASSWORD = 8;

/** Good enough to catch a typo, which is all client-side email validation can
 *  honestly claim to do. The real check is whether the address receives mail. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strips everything that is not a digit, then drops the shapes people type out
 *  of habit: a leading 0 (0300...) and a leading 92 (92300...). What is left is
 *  the national number. */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("92")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** E.164, which is the format the PRD stores and the format WhatsApp links
 *  need. Call it with the raw field value: it normalises first. */
export function toE164(input: string): string {
  return `${DIAL_CODE}${normalisePhone(input)}`;
}

/** Spaces it the way a Pakistani number is usually read aloud: +92 300 1234567.
 *  Display only. Never store this. */
export function formatPhone(input: string): string {
  const national = normalisePhone(input);
  if (national.length <= 3) return `${DIAL_CODE} ${national}`.trim();
  return `${DIAL_CODE} ${national.slice(0, 3)} ${national.slice(3)}`;
}

export function validateIdentity(fields: AccountFields): Record<string, string> {
  const found: Record<string, string> = {};
  if (!fields.fullName.trim()) {
    found.fullName = "We need something to call you.";
  }
  if (!fields.email.trim()) {
    found.email = "Add your email.";
  } else if (!EMAIL_PATTERN.test(fields.email.trim())) {
    found.email = "That does not look like an email address.";
  }
  if (!fields.password) {
    found.password = "Pick a password.";
  } else if (fields.password.length < MIN_PASSWORD) {
    found.password = `Make it at least ${MIN_PASSWORD} characters.`;
  }
  if (!fields.confirmPassword) {
    found.confirmPassword = "Type it once more.";
  } else if (fields.confirmPassword !== fields.password) {
    found.confirmPassword = "These two do not match.";
  }
  return found;
}

export function validatePhone(fields: AccountFields): Record<string, string> {
  const found: Record<string, string> = {};
  const national = normalisePhone(fields.phone);
  if (!national) {
    found.phone = "Add the number buyers should WhatsApp.";
  } else if (national.length !== 10) {
    // Every Pakistani mobile is 10 digits after the country code: 3xx then
    // seven more. Anything else is a typo or a landline.
    found.phone = "A Pakistani mobile number is 10 digits, starting 3.";
  } else if (!national.startsWith("3")) {
    found.phone = "That looks like a landline. WhatsApp needs a mobile.";
  }
  return found;
}
