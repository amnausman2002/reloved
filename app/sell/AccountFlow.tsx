"use client";

import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import Input from "@/components/ui/Input";
import {
  DIAL_CODE,
  MIN_PASSWORD,
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
// CHANGED 12 Oct: the SMS code screen is gone. Amna and Bismah verify numbers
// by hand from the admin queue, by tapping the WhatsApp link before approving,
// so the number is saved with phone_verified_at null and stays that way until
// one of them confirms it.
//
// The code screen it replaced accepted any six digits, which was worse than
// having no screen: it told a seller her number was confirmed when nothing had
// been checked. It is still in git if SMS ever comes back, along with
// OTP_LENGTH and the .otp-* CSS.

type Step = "identity" | "phone";

const STEPS: Step[] = ["identity", "phone"];

type Props = {
  /** For the card at the top of the first screen, so she can see what she is
   *  saving. Her listing is the reason she is filling this in. */
  listing: { title: string; price: string; coverUrl?: string; summary: string };
  /** Hands the finished answers back. SellFlow does the actual submitting,
   *  because it owns the photos and the form. */
  onDone: (account: AccountFields) => void;
  /** Back to the form. Her answers survive, because they live up in SellFlow. */
  onBack: () => void;
  fields: AccountFields;
  onChange: (patch: Partial<AccountFields>) => void;
  /** True while her account is being made and the photos are uploading. */
  busy?: boolean;
  /** Whatever went wrong in SellFlow's submit, shown on whichever screen she
   *  is standing on. */
  submitError?: string | null;
};

export default function AccountFlow({
  listing,
  onDone,
  onBack,
  fields,
  onChange,
  busy = false,
  submitError = null,
}: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  function goTo(next: Step) {
    setErrors({});
    setStep(next);
  }

  function submitIdentity(event: React.FormEvent) {
    event.preventDefault();
    const found = validateIdentity(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // The account itself is created at the end, in SellFlow, together with the
    // photo upload and the listing write. Creating it here would leave an
    // orphan account behind every time someone abandoned the next screen.
    goTo("phone");
  }

  /** Last screen. Hands everything back to SellFlow, which signs her up,
   *  uploads the photos and writes the listing. */
  function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    const found = validatePhone(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onDone(fields);
  }

  const stepIndex = STEPS.indexOf(step);

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
                  We check this number is on WhatsApp before your listing goes live.
                </p>
              )}
            </div>

            {submitError && <p className="input-error-msg">{submitError}</p>}

            <div className="sell-footer">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Saving your listing..." : "Submit my listing"}
              </PrimaryButton>
              <TextLink onClick={() => goTo("identity")} disabled={busy}>
                Back
              </TextLink>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
