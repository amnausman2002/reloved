// Creates an admin, or promotes an existing user. By email.
//
//   npm run make-admin -- amna.usn@gmail.com "Amna"
//   npm run make-admin -- bismah@example.com "Bismah"
//   npm run make-admin -- someone@example.com --revoke
//
// This exists because nothing in the app can grant admin, on purpose.
// firestore.rules blocks a user from writing is_admin on herself, which is the
// one field that would let anyone approve listings and read every seller's
// phone number. So it is a deliberate trip to a terminal, by someone who
// already has the project's credentials.
//
// It does not need her to have sold anything. An admin is a user with the flag
// set, and the PRD is explicit that buyers, sellers and admins are the same
// entity: what differs is what they have done. So this makes the account and
// the user document if they are not there, and leaves them alone if they are.
//
// NO PASSWORD IS SET OR PRINTED HERE. A throwaway one is used to create the
// account and immediately forgotten; the script prints a Firebase password
// reset link instead, which you open to choose your own. That way the password
// never goes through this script, your shell history, or anyone else.

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const positional = args.filter((arg) => !arg.startsWith("--"));
const email = positional[0];
const name = positional[1];

if (!email) {
  console.error('Usage: npm run make-admin -- <email> ["Display name"] [--revoke]');
  process.exit(1);
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

/** First name only, the same rule the sell flow uses. Falls back to the part
 *  of the email before the @, tidied up, so this never has to be passed. */
function displayNameFor(): string {
  if (name) return name.split(/\s+/)[0];
  const local = email.split("@")[0].split("+")[0].replace(/[._-]+/g, " ").trim();
  const first = local.split(/\s+/)[0] ?? "Admin";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

async function findOrCreateAuthUser(): Promise<{ user: UserRecord; created: boolean }> {
  const auth = getAuth();
  try {
    return { user: await auth.getUserByEmail(email), created: false };
  } catch {
    // Long and random, used once and never written down. She sets her real one
    // through the reset link below.
    const throwaway = randomBytes(24).toString("base64url");
    const user = await auth.createUser({
      email,
      password: throwaway,
      displayName: displayNameFor(),
      emailVerified: false,
    });
    return { user, created: true };
  }
}

async function main() {
  const db = getFirestore();
  const auth = getAuth();

  if (revoke) {
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(email)).uid;
    } catch {
      console.error(`No account for ${email}. Nothing to revoke.`);
      process.exit(1);
    }
    await db.collection("users").doc(uid).update({ is_admin: false });
    console.log(`Revoked admin from ${email}`);
    return;
  }

  const { user, created } = await findOrCreateAuthUser();
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    await ref.update({ is_admin: true });
    console.log(`Made admin: ${email}`);
    console.log(`  Existing account, nothing else changed.`);
  } else {
    // The same shape upsertSellerProfile writes, so an admin who later lists
    // something has a normal user document and not a special case.
    await ref.set({
      email,
      display_name: displayNameFor(),
      phone: null,
      phone_verified_at: null,
      email_verified_at: null,
      city: null,
      bio: null,
      avatar_url: null,
      is_admin: true,
      created_at: FieldValue.serverTimestamp(),
    });
    console.log(`Made admin: ${email} (${displayNameFor()})`);
  }

  if (created) {
    const link = await auth.generatePasswordResetLink(email);
    console.log("");
    console.log("New account. Open this link to set your password, then sign in at /admin:");
    console.log("");
    console.log(`  ${link}`);
    console.log("");
    console.log("The link is single use and expires in about an hour.");
    console.log("Run this command again if it runs out.");
  } else {
    console.log("Sign in at /admin with your existing password.");
    console.log("Forgotten it? Run this again after deleting the account in the Firebase console,");
    console.log("or use Authentication > Users > Reset password there.");
  }
}

void main();
