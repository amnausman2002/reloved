"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import BottomSheet from "@/components/ui/BottomSheet";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import Input from "@/components/ui/Input";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";

// What stands between a signed-out buyer and a seller's WhatsApp.
//
// The PRD's Path 3, step 5: the first time she taps Message seller she gives
// an email, and only then. She is never asked for a phone number, and she can
// browse and search the whole app without an account. This sheet is the only
// place a buyer is ever stopped.
//
// A sheet rather than a page, because she is one tap from the thing she wants
// and sending her to a different screen loses the listing she was looking at.
// Signing up is the exception: that is a real form with a name and a password,
// so it opens the account page properly, and `next` brings her back here.
//
// NEW 14 Oct. components.html has no design for it. The shape is the sell
// flow's confirm-number sheet: heading, two fields, one primary action and one
// quieter way out. Flagged for Bismah.

/** Firebase's codes are not for reading aloud. Same wording as the account
 *  page, because it is the same sign-in. */
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
  /** Where to send her after she signs up: back to this listing. */
  signUpHref: string;
  /** Called once she is signed in. The item page opens WhatsApp from here,
   *  which works because it happens in the same tab rather than a popup. */
  onSignedIn: () => void;
};

export default function ContactGate({ open, onClose, signUpHref, onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      // Not cleared on purpose: the sheet is about to close and the page is
      // about to navigate to WhatsApp.
      onSignedIn();
    } catch (caught) {
      setError(signInError((caught as { code?: string }).code ?? ""));
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => (busy ? undefined : onClose())}
      heading="Log in to message the seller"
      body="Sellers only hear from real accounts, which keeps the time-wasters away. We never ask a buyer for a phone number."
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
        {/* A real link, not a button: signing up is a full page with a name and
            a password on it, and `next` carries her back to this listing. */}
        <TextLink href={signUpHref}>New here? Create an account</TextLink>
      </form>
    </BottomSheet>
  );
}
