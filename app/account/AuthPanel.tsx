"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import Nav from "@/components/ui/Nav";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import Input from "@/components/ui/Input";
import { firebaseAuth, firebaseDb, firebaseConfigured } from "@/lib/firebase/client";
import { useAuthUser } from "@/lib/useAuthUser";
import { COLLECTIONS } from "@/lib/data/types";
// The sell flow's account step owns these rules and this screen must agree with
// it to the character: same minimum password, same wording when something is
// missing. Imported rather than copied, so there is one place to change them.
import { EMPTY_ACCOUNT, MIN_PASSWORD, validateIdentity, type AccountFields } from "@/app/sell/account";

type Mode = "signup" | "login";

// Same two icons as the sell flow's account step, for the same reason: the
// stroke follows currentColor, so the icon changes with the button's state.
// The open eye means "tap to reveal" and shows while the password is hidden.

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

/** Firebase's error codes are not for reading aloud. Same job as signUpError in
 *  app/sell/submitListing.ts, with the sign-in codes added, because this screen
 *  is the only place somebody logs in without a listing in hand. */
function authMessage(code: string): { message: string; field?: "email" | "password" } {
  switch (code) {
    case "auth/email-already-in-use":
      return { message: "There is already an account with this email. Log in instead?", field: "email" };
    case "auth/invalid-email":
      return { message: "That does not look like an email address.", field: "email" };
    case "auth/weak-password":
      return { message: "That password is too easy to guess. Try a longer one.", field: "password" };
    // Firebase answers a wrong password and an unknown email with the same code
    // on purpose, so that nobody can use this form to find out which addresses
    // have accounts. One message for both is the only honest option.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return { message: "That email and password did not match.", field: "password" };
    case "auth/too-many-requests":
      return { message: "Too many tries. Wait a minute and try again." };
    case "auth/network-request-failed":
      return { message: "We could not reach the internet. Check your connection and try again." };
    default:
      return { message: "Something went wrong at our end. Try again in a moment." };
  }
}

/** Her user document, written from the browser at sign-up.
 *
 *  firestore.rules allows exactly this and nothing more: her own id, is_admin
 *  false, phone_verified_at null. She cannot promise us her number is verified,
 *  which is the whole point, since Amna and Bismah check that by hand.
 *
 *  Never fatal. If it fails she still has an account and still lands on her
 *  profile, and upsertSellerProfile tops the document up the first time she
 *  submits a listing. */
async function createUserDoc(user: FirebaseUser, fullName: string): Promise<void> {
  try {
    // First name only. A buyer sees "Sara", never "Sara Khan". Same rule as
    // the submit route, which applies it for real.
    const displayName = fullName.trim().split(/\s+/)[0];
    await setDoc(
      doc(firebaseDb(), COLLECTIONS.users, user.uid),
      {
        email: user.email,
        display_name: displayName,
        // Both unknown until she lists something or edits her profile. The
        // number belongs to a listing, so this screen never asks for it.
        phone: null,
        city: null,
        bio: null,
        avatar_url: null,
        is_admin: false,
        email_verified_at: null,
        phone_verified_at: null,
        created_at: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("could not write user document at sign-up", error);
  }
}

export default function AuthPanel() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuthUser();

  // Sign up by default. The menu's "Log in" arrives with ?mode=login, which is
  // the only thing that opens the other half.
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "login" ? "login" : "signup");

  /** Where she was going before she was asked for an account. A buyer who
   *  tapped Message seller arrives with ?next=/item/xyz and belongs back on
   *  that listing, not on a seller profile she did not ask for.
   *
   *  Only a path on this site is accepted. Anything starting with a scheme, or
   *  with "//", would let a link from anywhere bounce someone off our domain
   *  wearing our name. */
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const [fields, setFields] = useState<AccountFields>(EMPTY_ACCOUNT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in, so there is nothing to do here. Straight to her profile,
  // which is where both buttons on this screen end up anyway.
  useEffect(() => {
    if (!loading && user) router.replace(next ?? `/seller/${user.uid}`);
  }, [loading, user, router]);

  function patch(next: Partial<AccountFields>) {
    setFields((current) => ({ ...current, ...next }));
  }

  function switchTo(next: Mode) {
    setMode(next);
    setErrors({});
    setFormError(null);
  }

  function fail(code: string) {
    const { message, field } = authMessage(code);
    if (field) {
      setErrors({ [field]: message });
    } else {
      setFormError(message);
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    const found = validateIdentity(fields);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    if (!firebaseConfigured()) {
      setFormError("Accounts are not switched on in this copy of the app yet.");
      return;
    }

    setBusy(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth(),
        fields.email.trim(),
        fields.password,
      );
      // Firebase's own profile name, which is what the Auth console shows and
      // what her profile page puts at the top.
      await updateProfile(credential.user, { displayName: fields.fullName.trim() });
      await createUserDoc(credential.user, fields.fullName);

      // A full page load rather than router.replace, so every screen starts
      // from one restored session instead of from whatever each component
      // happened to hear first. The admin sign-in reloads for the same reason.
      //
      // The name needs this and more. updateProfile does not tell
      // onAuthStateChanged, and the copy Firebase saves in the browser is
      // written a moment after its promise resolves, so even a fresh load can
      // come back nameless. useAuthUser is what actually settles it: a user
      // with no name on it gets reloaded from Google before anything is shown.
      window.location.assign(next ?? `/seller/${credential.user.uid}`);
    } catch (error) {
      fail((error as { code?: string }).code ?? "");
      setBusy(false);
    }
  }

  async function handleLogIn(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!fields.email.trim()) found.email = "Add your email.";
    if (!fields.password) found.password = "Add your password.";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    if (!firebaseConfigured()) {
      setFormError("Accounts are not switched on in this copy of the app yet.");
      return;
    }

    setBusy(true);
    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth(),
        fields.email.trim(),
        fields.password,
      );
      router.replace(next ?? `/seller/${credential.user.uid}`);
    } catch (error) {
      fail((error as { code?: string }).code ?? "");
      setBusy(false);
    }
  }

  /* The password field is written out by hand rather than using <Input>,
     because the reveal toggle sits inside the box and that component has no
     slot for one. Same classes, so it behaves like every other field. Lifted
     from the sell flow's account step unchanged. */
  function passwordField(autoComplete: "new-password" | "current-password") {
    return (
      <div>
        <label className="input-label" htmlFor="auth-password">
          Password
        </label>
        <div className="input-with-reveal">
          <input
            id="auth-password"
            className={errors.password ? "input input-error" : "input"}
            type={showPassword ? "text" : "password"}
            autoComplete={autoComplete}
            placeholder={
              autoComplete === "new-password" ? `At least ${MIN_PASSWORD} characters` : "Your password"
            }
            value={fields.password}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "auth-password-error" : undefined}
            onChange={(event) => patch({ password: event.target.value })}
          />
          <button
            type="button"
            className="input-reveal"
            onClick={() => setShowPassword((current) => !current)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeClosedIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password && (
          <p className="input-error-msg" id="auth-password-error">
            {errors.password}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Outside <main>, same as every other page, so the bar sits at the top
          of the viewport and spans the full width. */}
      <Nav />
      <main className="container sell-page">
        <div className="sell-step">
          {mode === "signup" ? (
            <>
              <h1 className="text-h1 sell-heading">Ready to give your clothes a new home?</h1>
              {/* One account, both sides. A buyer sent here by Message seller
                  is not listing anything yet, and promising her she will "hear
                  from buyers" would be answering a question she did not ask. */}
              <p className="sell-sub">
                {next?.startsWith("/item/")
                  ? "One account for buying and selling. We never ask a buyer for a phone number."
                  : "Create an account to list your items, make changes anytime, and hear from buyers."}
              </p>

              <form className="account-form" onSubmit={(event) => void handleSignUp(event)} noValidate>
                <Input
                  label="Full name"
                  placeholder="Amna Usman"
                  autoComplete="name"
                  value={fields.fullName}
                  onChange={(event) => patch({ fullName: event.target.value })}
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
                  onChange={(event) => patch({ email: event.target.value })}
                  error={errors.email}
                />

                {passwordField("new-password")}

                <Input
                  label="Confirm password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Type it again"
                  value={fields.confirmPassword}
                  onChange={(event) => patch({ confirmPassword: event.target.value })}
                  error={errors.confirmPassword}
                />

                {formError && <p className="input-error-msg">{formError}</p>}

                <div className="sell-footer">
                  <PrimaryButton type="submit" loading={busy} loadingLabel="Creating your account...">
                    Create account
                  </PrimaryButton>
                  {/* The one addition to the sell flow's version of this
                      screen: in there she has a listing waiting and cannot
                      already have an account. Arriving from the menu, she
                      might. */}
                  <TextLink onClick={() => switchTo("login")} disabled={busy}>
                    Already have an account? Log in
                  </TextLink>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-h1 sell-heading">Good to have you back!</h1>

              <form className="account-form" onSubmit={(event) => void handleLogIn(event)} noValidate>
                <Input
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={fields.email}
                  onChange={(event) => patch({ email: event.target.value })}
                  error={errors.email}
                />

                {passwordField("current-password")}

                {formError && <p className="input-error-msg">{formError}</p>}

                <div className="sell-footer">
                  <PrimaryButton type="submit" loading={busy} loadingLabel="Logging you in...">
                    Log in
                  </PrimaryButton>
                  <TextLink onClick={() => switchTo("signup")} disabled={busy}>
                    New here? Create an account
                  </TextLink>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  );
}
