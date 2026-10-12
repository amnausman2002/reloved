// Grants admin to a user, by email.
//
//   npx tsx scripts/make-admin.ts amna.usn@gmail.com
//   npx tsx scripts/make-admin.ts someone@example.com --revoke
//
// This exists because nothing in the app can grant admin, on purpose.
// firestore.rules blocks a user from writing is_admin on herself, which is the
// one field that would let anyone approve listings and read every seller's
// phone number. So it is a deliberate trip to a terminal, by someone who
// already has the project's credentials.
//
// She has to have signed up through /sell first: this flips a flag on an
// existing user document, it does not create one.

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email> [--revoke]");
  process.exit(1);
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

async function main() {
  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch {
    console.error(`No account for ${email}. She has to sign up through /sell first.`);
    process.exit(1);
  }

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(
      `${email} has a sign-in but no user document. That happens if she signed up without finishing a listing. Submit one, then run this again.`,
    );
    process.exit(1);
  }

  await ref.update({ is_admin: !revoke });
  console.log(`${revoke ? "Revoked admin from" : "Made admin:"} ${email} (${uid})`);
  console.log(`  display_name: ${snap.get("display_name")}`);
}

void main();
