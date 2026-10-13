"use client";

import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import {
  DIAL_CODE,
  MIN_PASSWORD,
  formatNational,
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

// Tabler's eye and eye-closed, inlined rather than imported from a file so the
// stroke follows currentColor and the icon changes with the button's own
// state. Same approach as every other icon in the sell flow.
//
// The open eye means "tap to reveal", so it shows while the password is
// hidden. The struck-through eye shows while it is visible. Both are
// decorative: the button carries aria-label for its name.

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 9c-2.4 2.667 -5.4 4 -9 4c-3.6 0 -6.6 -1.333 -9 -4" />
      <path d="M3 15l2.5 -3.8" />
      <path d="M21 14.976l-2.492 -3.776" />
      <path d="M9 17l.5 -4" />
      <path d="M15 17l-.5 -4" />
    </svg>
  );
}

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
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function goTo(next: Step) {
    setErrors({});
    setStep(next);
  }

  async function submitIdentity(event: React.FormEvent) {
    event.preventDefault();
    const found = validateIdentity(fields);

    // The email check runs first and on its own. Finding out the address is
    // taken matters more than the password being short: one means she already
    // has an account and should sign in, the other is a typo away from fixed.
    // Showing only "make it 8 characters" would send her off to invent a new
    // password for an account she already has.
    const email = fields.email.trim();
    if (email && !found.email) {
      setCheckingEmail(true);
      let taken = false;
      try {
        const response = await fetch("/api/auth/email-exists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        taken = (await response.json())?.exists === true;
      } catch {
        // Offline, or the route is down. Carry on: she will hit the same
        // check at submit, where it is enforced for real.
      }
      setCheckingEmail(false);
      if (taken) {
        setToast(`There is already an account for ${email}.`);
        setErrors({ ...found, email: "Use a different email, or sign in with this one." });
        return;
      }
    }

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
      <Toast message={toast} onDismiss={() => setToast(null)} variant="error" />

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
            Your listing is almost ready! Create an account to manage your listing, make changes
            anytime, and get notified when it&apos;s live.
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

          <form className="account-form" onSubmit={(event) => void submitIdentity(event)} noValidate>
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
                  // The icon carries no text, so the control needs a name of
                  // its own or a screen reader announces an unlabelled button.
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeClosedIcon /> : <EyeIcon />}
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
              <PrimaryButton type="submit" disabled={checkingEmail}>
                {checkingEmail ? "Checking..." : "Create account"}
              </PrimaryButton>
              <TextLink onClick={onBack}>Back to my listing</TextLink>
            </div>
          </form>
        </>
      )}

      {step === "phone" && (
        <>
          <h1 className="text-h1 sell-heading">Where buyers reach you.</h1>
          <p className="sell-sub">
            Add your WhatsApp number so buyers can get in touch about your listing. It&apos;ll only
            be visible once your listing is live.
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
                  value={formatNational(fields.phone)}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "account-phone-error" : undefined}
                  onChange={(event) => onChange({ phone: normalisePhone(event.target.value) })}
                />
              </div>
              {errors.phone && (
                <p className="input-error-msg" id="account-phone-error">
                  {errors.phone}
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
