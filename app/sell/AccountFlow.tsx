"use client";

import { useEffect, useRef, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import Input from "@/components/ui/Input";
import {
  DIAL_CODE,
  MIN_PASSWORD,
  OTP_LENGTH,
  formatPhone,
  normalisePhone,
  validateIdentity,
  validatePhone,
  type AccountFields,
} from "./account";

// The account step, reached from Submit listing and from nowhere else.
//
// NEW: components.html has no design for any of this. Each piece says which
// existing pattern it is built from, same as the rest of the sell flow.
// Flagged for Bismah, along with the password reveal toggle, which is the one
// control here with no precedent anywhere in the design system.
//
// NOT WIRED UP. Nothing below creates a user, sends an SMS or checks a code.
// Where Firebase goes is marked with TODO. Until then any 6 digits are
// accepted, so the flow can be walked end to end on a laptop.

type Step = "identity" | "phone" | "code";

const STEPS: Step[] = ["identity", "phone", "code"];

/** How long before Resend becomes tappable. Long enough that she gives the SMS
 *  a chance to arrive, short enough that a failed send is not a dead end. */
const RESEND_SECONDS = 45;

type Props = {
  /** For the card at the top of the first screen, so she can see what she is
   *  saving. Her listing is the reason she is filling this in. */
  listing: { title: string; price: string; coverUrl?: string; summary: string };
  /** Called once the number is verified. SellFlow shows the success sheet. */
  onDone: (account: AccountFields) => void;
  /** Back to the form. Her answers survive, because they live up in SellFlow. */
  onBack: () => void;
  fields: AccountFields;
  onChange: (patch: Partial<AccountFields>) => void;
};

export default function AccountFlow({ listing, onDone, onBack, fields, onChange }: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const boxesRef = useRef<Array<HTMLInputElement | null>>([]);

  // The resend countdown. Restarts whenever we land on the code step, which is
  // also what happens after she taps Resend.
  useEffect(() => {
    if (step !== "code") return;
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, secondsLeft]);

  function goTo(next: Step) {
    setErrors({});
    setStep(next);
  }

  function submitIdentity(event: React.FormEvent) {
    event.preventDefault();
    const found = validateIdentity(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // TODO: createUserWithEmailAndPassword here, so a taken address is caught
    // now rather than after she has also waited for an SMS.
    goTo("phone");
  }

  function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    const found = validatePhone(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // TODO: signInWithPhoneNumber, with invisible reCAPTCHA. Invisible: there
    // is no "I'm not a robot" checkbox to draw.
    setDigits(Array(OTP_LENGTH).fill(""));
    setCodeError(null);
    setSecondsLeft(RESEND_SECONDS);
    goTo("code");
  }

  /** One box per digit. Typing moves forward, Backspace on an empty box moves
   *  back, and a pasted code fills the row. */
  function setDigit(index: number, value: string) {
    const typed = value.replace(/\D/g, "");
    if (!typed) {
      setDigits((current) => current.map((digit, i) => (i === index ? "" : digit)));
      return;
    }
    setDigits((current) => {
      const next = [...current];
      // A paste lands entirely in the box that was focused, so spread it.
      for (let i = 0; i < typed.length && index + i < OTP_LENGTH; i += 1) {
        next[index + i] = typed[i];
      }
      return next;
    });
    setCodeError(null);
    const landed = Math.min(index + typed.length, OTP_LENGTH - 1);
    boxesRef.current[landed]?.focus();
  }

  function handleDigitKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      boxesRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) boxesRef.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) boxesRef.current[index + 1]?.focus();
  }

  function submitCode(event: React.FormEvent) {
    event.preventDefault();
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setCodeError("Pop in all six digits.");
      return;
    }
    // TODO: confirmationResult.confirm(code), then write phone_verified_at.
    // Until Firebase exists any six digits are treated as correct, so the rest
    // of the flow can be walked through on a laptop.
    onDone(fields);
  }

  /** The PRD's own fallback: a broken code service must never block a listing.
   *  OPEN QUESTION for Amna and Bismah. Her listing goes to review either way,
   *  but with no verified number there is no WhatsApp button on it, so it
   *  cannot go live as it stands. */
  function carryOnWithout() {
    onDone({ ...fields, phone: "" });
  }

  const stepIndex = STEPS.indexOf(step);
  const code = digits.join("");

  return (
    <div className="sell-step">
      {/* Built from the condition picker's "marker, then label" idea, shrunk to
          its smallest form. Three dots, the current one filled. */}
      <ol className="account-steps" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
        {STEPS.map((name, index) => (
          <li
            key={name}
            className={[
              "account-dot",
              index < stepIndex && "is-done",
              index === stepIndex && "is-now",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          />
        ))}
      </ol>

      {step === "identity" && (
        <>
          <h1 className="text-h1 sell-heading">Save your listing.</h1>
          <p className="sell-sub">
            Your photos and details are ready. Make an account so they are yours to edit, and so we
            can tell you when you are live.
          </p>

          {/* Same shape as .bottom-sheet-item, which is where a listing is
              already summarised next to its cover photo. */}
          <div className="account-summary">
            {listing.coverUrl ? (
              <img className="account-summary-thumb" src={listing.coverUrl} alt="" />
            ) : (
              <div className="account-summary-thumb" />
            )}
            <div>
              <p className="bottom-sheet-item-name">{listing.title || "Your listing"}</p>
              <p className="bottom-sheet-item-price">{listing.summary}</p>
            </div>
          </div>

          <form className="account-form" onSubmit={submitIdentity} noValidate>
            <Input
              label="Full name"
              placeholder="Amna Usman"
              autoComplete="name"
              value={fields.fullName}
              onChange={(event) => onChange({ fullName: event.target.value })}
              error={errors.fullName}
              hint="Buyers only ever see your first name."
            />

            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={fields.email}
              onChange={(event) => onChange({ email: event.target.value })}
              error={errors.email}
            />

            {/* Written out rather than using <Input>, because the reveal toggle
                sits inside the field and that component has no slot for one.
                Same classes, so it behaves like every other field. */}
            <div>
              <label className="input-label" htmlFor="account-password">
                Password
              </label>
              <div className="input-with-reveal">
                <input
                  id="account-password"
                  className={errors.password ? "input input-error" : "input"}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  value={fields.password}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "account-password-error" : undefined}
                  onChange={(event) => onChange({ password: event.target.value })}
                />
                <button
                  type="button"
                  className="input-reveal"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p className="input-error-msg" id="account-password-error">
                  {errors.password}
                </p>
              )}
            </div>

            <Input
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Type it again"
              value={fields.confirmPassword}
              onChange={(event) => onChange({ confirmPassword: event.target.value })}
              error={errors.confirmPassword}
            />

            <div className="sell-footer">
              <PrimaryButton type="submit">Continue</PrimaryButton>
              <TextLink onClick={onBack}>Back to my listing</TextLink>
            </div>
          </form>
        </>
      )}

      {step === "phone" && (
        <>
          <h1 className="text-h1 sell-heading">Where buyers reach you.</h1>
          <p className="sell-sub">
            This is the number behind the WhatsApp button on your listing. It is only shown once
            your listing is live.
          </p>

          <form className="account-form" onSubmit={submitPhone} noValidate>
            {/* Same .input-with-prefix pattern as the asking price field, where
                the currency also sits inside the box. */}
            <div>
              <label className="input-label" htmlFor="account-phone">
                WhatsApp number
              </label>
              <div className="input-with-prefix">
                <span className="input-prefix" aria-hidden="true">
                  {DIAL_CODE}
                </span>
                <input
                  id="account-phone"
                  className={errors.phone ? "input input-error" : "input"}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="300 1234567"
                  value={fields.phone}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={
                    errors.phone ? "account-phone-error" : "account-phone-hint"
                  }
                  onChange={(event) => onChange({ phone: normalisePhone(event.target.value) })}
                />
              </div>
              {errors.phone ? (
                <p className="input-error-msg" id="account-phone-error">
                  {errors.phone}
                </p>
              ) : (
                <p className="input-hint" id="account-phone-hint">
                  We text a {OTP_LENGTH} digit code to check it is yours.
                </p>
              )}
            </div>

            <div className="sell-footer">
              <PrimaryButton type="submit">Send me the code</PrimaryButton>
              <TextLink onClick={() => goTo("identity")}>Back</TextLink>
            </div>
          </form>
        </>
      )}

      {step === "code" && (
        <>
          <h1 className="text-h1 sell-heading">Pop in the code.</h1>
          <p className="sell-sub">
            Sent to {formatPhone(fields.phone)}. It should land in a few seconds.
          </p>

          <form className="account-form" onSubmit={submitCode} noValidate>
            <div>
              {/* One box per digit rather than a single field, so a six digit
                  code is readable at a glance on a phone. */}
              <div className="otp-row" role="group" aria-label="Verification code">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(node) => {
                      boxesRef.current[index] = node;
                    }}
                    className={digit ? "otp-box is-filled" : "otp-box"}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    // Not maxLength={1}: a pasted or autofilled code arrives in
                    // one box and setDigit spreads it across the row.
                    value={digit}
                    aria-label={`Digit ${index + 1}`}
                    onChange={(event) => setDigit(index, event.target.value)}
                    onKeyDown={(event) => handleDigitKeyDown(index, event)}
                  />
                ))}
              </div>

              <div className="otp-meta">
                {secondsLeft > 0 ? (
                  <span>
                    Resend in 0:{String(secondsLeft).padStart(2, "0")}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="otp-meta-action"
                    onClick={() => {
                      // TODO: send again. Resetting the clock is all it does
                      // until Firebase is wired up.
                      setSecondsLeft(RESEND_SECONDS);
                      setDigits(Array(OTP_LENGTH).fill(""));
                      setCodeError(null);
                    }}
                  >
                    Send it again
                  </button>
                )}
                <button type="button" className="otp-meta-action" onClick={() => goTo("phone")}>
                  Change number
                </button>
              </div>

              {codeError && <p className="input-error-msg">{codeError}</p>}
            </div>

            <div className="sell-footer">
              <PrimaryButton type="submit" disabled={code.length < OTP_LENGTH}>
                Submit my listing
              </PrimaryButton>
              {/* OPEN QUESTION, see carryOnWithout above. */}
              <TextLink onClick={carryOnWithout}>Code not arriving? Carry on without it</TextLink>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
