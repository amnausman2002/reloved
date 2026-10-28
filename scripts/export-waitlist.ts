// Writes the whole waitlist to a CSV, for importing into Google Sheets.
//
//   npm run export-waitlist
//
// Saves exports/waitlist-YYYY-MM-DD.csv (git ignores that folder: it is full
// of people's emails and numbers). Every run is the full list, newest last,
// so each day's import simply replaces the sheet.
//
// Runs on your own gcloud login, like make-admin. If it fails with a
// credentials error: gcloud auth application-default login

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, type Timestamp } from "firebase-admin/firestore";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COLUMNS = [
  "email",
  "phone",
  "intent",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "referrer",
  "form_location",
  "created_at",
  "updated_at",
] as const;

const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

/** Pakistan time, which Sheets reads as a date: 2026-10-30 14:05:09. */
function pkt(value: unknown): string {
  if (!value || typeof (value as Timestamp).toMillis !== "function") return "";
  const shifted = new Date((value as Timestamp).toMillis() + 5 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 19).replace("T", " ");
}

/** utm values and the referrer come straight from a URL anyone can type, and
 *  a cell starting with = is a formula once it is in Sheets. The apostrophe
 *  makes it plain text. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

async function main() {
  const snapshot = await getFirestore().collection("waitlist").orderBy("created_at", "asc").get();

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return COLUMNS.map((column) => {
      if (column === "created_at" || column === "updated_at") return pkt(data[column]);
      // Checked on the server as +92 and ten digits, so it can never be a
      // formula, and escaping it would put an apostrophe in front of every number.
      if (column === "phone") return data.phone ?? "";
      return cell(data[column] == null ? "" : String(data[column]));
    }).join(",");
  });

  const dir = join(process.cwd(), "exports");
  mkdirSync(dir, { recursive: true });
  const today = pkt({ toMillis: () => Date.now() }).slice(0, 10);
  const file = join(dir, `waitlist-${today}.csv`);
  writeFileSync(file, [COLUMNS.join(","), ...rows].join("\n") + "\n");

  const sellers = snapshot.docs.filter((doc) => ["sell", "both"].includes(doc.get("intent"))).length;
  console.log(`${snapshot.size} on the waitlist (${sellers} want to sell). Saved to ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
