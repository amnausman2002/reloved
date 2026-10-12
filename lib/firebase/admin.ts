// Firebase on the server. The one place the Admin SDK is set up.
//
// The Admin SDK bypasses firestore.rules completely. That is the point: the
// PRD says listings and their status are written only by the server, never
// from the browser, so approving a listing has to happen somewhere the rules
// do not apply. It also means every write through here is unguarded, and the
// permission check has to be done by the caller before it gets this far.
//
// SERVER ONLY. Importing this from a client component would ship a credential
// that can read and write every document in the project. The guard below
// throws the moment this module is evaluated in a browser.
//
// Vercel's `server-only` package turns that into a build-time error instead,
// which is better, but it is another dependency for one line. Revisit if this
// ever gets imported by mistake.

import { getApps, getApp, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

if (typeof window !== "undefined") {
  throw new Error(
    "lib/firebase/admin.ts reached the browser. It holds credentials that can " +
      "read and write every document in the project. Use lib/firebase/client.ts instead.",
  );
}

/** No key file and no service-account JSON anywhere, which is the same rule
 *  CLAUDE.md sets for Gemini. On a laptop this picks up the credentials from
 *  `gcloud auth application-default login`. On App Hosting it picks up the
 *  firebase-app-hosting-compute service account automatically. */
function adminApp(): App {
  if (getApps().length > 0) return getApp();
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminStorage(): Storage {
  return getStorage(adminApp());
}

/** Reads the signed-in user from an ID token sent by the browser.
 *
 *  Every server route that acts on someone's behalf has to call this rather
 *  than trusting a user id in the request body. A browser can put any id it
 *  likes in a body; it cannot forge a token signed by Google.
 *
 *  Returns null rather than throwing, so a route can decide whether missing
 *  sign-in is a 401 or just an anonymous visitor. */
export async function userFromIdToken(idToken: string | undefined): Promise<{
  uid: string;
  email: string | null;
} | null> {
  if (!idToken) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    // Expired, malformed or signed by someone else. All the same answer.
    return null;
  }
}

/** Whether this user is one of us.
 *
 *  `is_admin` lives on the User document, not on the auth token, because the
 *  PRD says there is no role field and an admin is just a user with the flag
 *  set. That means one extra read per admin action, which at two admins is
 *  not worth optimising.
 *
 *  CLAUDE.md: enforce permissions on the server and in the rules, never by
 *  hiding buttons. This is the server half. */
export async function isAdmin(uid: string | null | undefined): Promise<boolean> {
  if (!uid) return false;
  const snap = await adminDb().collection("users").doc(uid).get();
  return snap.exists && snap.get("is_admin") === true;
}
