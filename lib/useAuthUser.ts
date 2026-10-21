"use client";

// Who is actually signed in, from Firebase Auth.
//
// The only answer to "who is looking at this page". It is null until somebody
// signs in, and nothing anywhere pretends otherwise: the mock current user that
// used to stand in for her (lib/useCurrentUser.ts) was deleted on 14 Oct along
// with the rest of the sample data.
//
// Firebase restores a session asynchronously after the page loads, so every
// caller gets `loading` as well. Reading `user` while loading is still true and
// treating null as "signed out" is how you get a flash of the wrong menu.

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";
import { rememberAccount } from "@/lib/knownAccount";
import type { City } from "@/lib/constants";

export type AuthUser = {
  uid: string;
  email: string | null;
  /** Firebase's own profile name, set at sign-up from her full name. */
  displayName: string | null;
  /** ISO date, from Firebase's account metadata. */
  createdAt: string;
};

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  };
}

export function useAuthUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Starts true because the answer always arrives in a later tick, even when
  // it turns out to be "nobody".
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The app has to keep working on a laptop with no Firebase config, which is
    // how the buyer side is still being built. Nobody is signed in, and that is
    // a settled answer rather than a pending one.
    if (!firebaseConfigured()) {
      setLoading(false);
      return;
    }
    // Cleared on unmount, so the reload below cannot set state on a screen
    // that has already gone.
    let live = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth(), (next) => {
      if (!next) {
        setUser(null);
        setLoading(false);
        return;
      }

      // So a seller who logs out and comes back to Sell is asked to log in
      // rather than to sign up. Every page has the nav, so this sees every
      // sign-in, wherever it happened.
      rememberAccount(next.email);

      // An account with no name on it is almost always a stale copy rather
      // than the truth. Firebase saves the account to the browser, and at
      // sign-up the name is added a moment after the account exists, so a page
      // that loads in that gap restores the nameless version and keeps it for
      // the whole visit. What she sees then is the front of her email address
      // where her name should be, on her own profile.
      //
      // reload() asks Google for the real account. Answering a fraction of a
      // second later is better than answering wrongly and correcting it in
      // front of her, so this waits rather than publishing twice.
      if (!next.displayName) {
        next
          .reload()
          .catch(() => {
            // Offline, or the account is gone. Whatever we were handed is
            // still the best answer available.
          })
          .finally(() => {
            if (!live) return;
            setUser(toAuthUser(next));
            setLoading(false);
          });
        return;
      }

      setUser(toAuthUser(next));
      setLoading(false);
    });

    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}

export async function signOutUser(): Promise<void> {
  if (!firebaseConfigured()) return;
  await signOut(firebaseAuth());
  // The admin queue reads its token from here, and leaving it behind would keep
  // a signed-out browser looking signed in to the server.
  document.cookie = "reloved_admin_token=; path=/; max-age=0; samesite=strict";
}

/** First name only, the way a buyer sees her: "Sara", never "Sara Khan".
 *  Same rule as the submit route, which is where it is applied for real. */
export function firstName(user: AuthUser): string {
  const name = user.displayName?.trim();
  if (name) return name.split(/\s+/)[0];
  // No name on the account yet. The part before the @ is a better guess than
  // the whole address, and far better than "Seller".
  return user.email?.split("@")[0] ?? "You";
}

/** The shape the seller profile page needs, built from the signed-in account.
 *
 *  A real account has no listings, no bio and no city until she fills them in,
 *  so this is deliberately thin. It exists so a seller who has just signed up
 *  lands on her own profile instead of "Seller not found". */
export type ProfileSeller = {
  id: string;
  displayName: string;
  city: City | null;
  bio?: string;
  createdAt: string;
};

export function sellerFromAuth(user: AuthUser): ProfileSeller {
  return {
    id: user.uid,
    displayName: firstName(user),
    // She has not told us yet. The profile asks for it on the edit screen, and
    // every listing carries its own city anyway.
    city: null,
    createdAt: user.createdAt,
  };
}
