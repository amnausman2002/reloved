// Firebase in the browser. The one place the client SDK is set up.
//
// This is the seller's and the buyer's half: signing in, signing out, reading
// her own listings. It can never write a listing's status, because
// firestore.rules forbids it. Status is the server's job (see admin.ts).
//
// The values below are public. A Firebase web config is a set of project
// identifiers, not credentials: it ships in the JavaScript bundle of every
// Firebase web app and Google documents it as safe to expose. The thing that
// protects the data is firestore.rules. This is NOT the same as the Gemini
// rule in CLAUDE.md about never using API keys, which is about server-side
// credentials and still holds.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Next renders some components twice in development and keeps modules alive
 *  across hot reloads, so initializeApp can be reached more than once. Reusing
 *  the existing app is what Firebase's own docs recommend. */
function app(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function firebaseAuth(): Auth {
  return getAuth(app());
}

export function firebaseDb(): Firestore {
  return getFirestore(app());
}

export function firebaseStorage(): FirebaseStorage {
  return getStorage(app());
}

/** True when the config is actually present. The app has to keep working
 *  without Firebase while the rest of it is being wired up, so callers can
 *  check this rather than crashing on a missing project id. */
export function firebaseConfigured(): boolean {
  return Boolean(config.projectId && config.apiKey);
}
