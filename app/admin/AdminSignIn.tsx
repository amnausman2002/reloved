"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Input from "@/components/ui/Input";

// Sign-in for the queue. Only two people ever see this screen.
//
// Firebase keeps the session in the browser, but a server component cannot
// read that, and the queue has to be server-rendered so sellers' phone numbers
// are never sent to a browser that should not have them. So after signing in
// we put the ID token in a cookie and reload, and the server reads it there.
//
// The cookie is session-only and is not httpOnly, because the browser's own
// Firebase SDK has to be able to refresh it. That is acceptable for a token
// that expires in an hour and is useless without is_admin on the account, but
// it is the weakest part of this and worth replacing with a proper session
// cookie (adminAuth().createSessionCookie) before launch.

type Props = {
  /** Set when someone is signed in but cannot review listings, so she is told
   *  which account she is carrying rather than just being refused again. */
  wrongAccount?: string;
};

export default function AdminSignIn({ wrongAccount }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Drop the stale token straight away. Without this, signing in as an admin
  // from here would race the old cookie and she could bounce back to this
  // screen for no visible reason.
  useEffect(() => {
    if (wrongAccount) {
      document.cookie = "reloved_admin_token=; path=/; max-age=0; samesite=strict";
    }
  }, [wrongAccount]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      const token = await credential.user.getIdToken();
      // One hour, matching the token's own lifetime. A stale cookie would just
      // bounce her back to this screen.
      document.cookie = `reloved_admin_token=${token}; path=/; max-age=3600; samesite=strict`;
      window.location.reload();
    } catch {
      setError("That email and password did not match.");
      setBusy(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-signin">
        <h1 className="text-h1">Queue.</h1>
        <p className="sell-sub">
          {wrongAccount
            ? `${wrongAccount} cannot review listings. Sign in with your admin account.`
            : "Sign in to review listings."}
        </p>

        <form className="account-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error ?? undefined}
          />
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
