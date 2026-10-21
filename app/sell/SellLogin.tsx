"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import BottomSheet from "@/components/ui/BottomSheet";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import Input from "@/components/ui/Input";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";

// Logging in from inside the sell flow, over her finished listing.
//
// Before 21 Oct a seller who had an account but was signed out had no way to
// log in from here: the account step only signed people up, and told her
// "sign in with this one" without anywhere to do it. Leaving to log in threw
// her listing away. This sheet is that missing door.
//
// Opened at Submit when this phone has signed in before (lib/knownAccount.ts),
// with her email already in the box, and from "Already have an account?" on
// the sign-up screen.
//
// NEW 21 Oct. components.html has no design for it. The same shape as the
// buyer's ContactGate: heading, two fields, one primary action and one quieter
// way out. Flagged for Bismah. A separate file rather than ContactGate itself,
// because that sheet's copy and its sign-up link are the buyer's.

/** Same wording as ContactGate, because it is the same sign-in. */
function signInError(code: string): string {
  switch (code) {
    // Firebase answers a wrong password and an unknown email identically on
    // purpose, so nobody can use this form to discover which addresses exist.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password did not match.";
    case "auth/invalid-email":
      return "That does not look like an email address.";
    case "auth/too-many-requests":
      return "Too many tries. Wait a minute and try again.";
    case "auth/network-request-failed":
      return "We could not reach the internet. Check your connection.";
    default:
      return "Something went wrong at our end. Try again in a moment.";
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** The email to start with: the one this phone remembers, or the one she
   *  just typed on the sign-up screen and found was taken. */
  initialEmail: string;
  /** "Welcome back" when this phone knows her, plainer when it does not. */
  returning: boolean;
  /** One listing or several, for the line under the heading. */
  listingCount: number;
  /** Signed in. The flow carries on to her number from here. */
  onSignedIn: (email: string) => void | Promise<void>;
  /** Not her account, or no account yet. */
  onCreateAccount: () => void;
};

export default function SellLogin({
  open,
  onClose,
  initialEmail,
  returning,
  listingCount,
  onSignedIn,
  onCreateAccount,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A fresh start each time it opens, with whichever email it was opened for.
  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setPassword("");
    setError(null);
    setBusy(false);
  }, [open, initialEmail]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Add your email and password.");
      return;
    }
    if (!firebaseConfigured()) {
      setError("Accounts are not switched on in this copy of the app yet.");
      return;
    }

    setBusy(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      await onSignedIn(credential.user.email ?? email.trim());
    } catch (caught) {
      setError(signInError((caught as { code?: string }).code ?? ""));
    }
    setBusy(false);
  }

  const what = listingCount === 1 ? "your listing" : `your ${listingCount} listings`;

  return (
    <BottomSheet
      open={open}
      onClose={() => (busy ? undefined : onClose())}
      heading={returning ? "Welcome back. Log in to post." : "Log in to post."}
      body={`Use the account you made before. ${what[0].toUpperCase()}${what.slice(1)} will stay just as you left it.`}
      dismissOnOverlayClick={false}
    >
      <form className="account-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error ?? undefined}
        />

        <PrimaryButton type="submit" loading={busy} loadingLabel="Logging you in...">
          Log in
        </PrimaryButton>
        <TextLink onClick={onCreateAccount} disabled={busy}>
          New here? Create an account
        </TextLink>
      </form>
    </BottomSheet>
  );
}
