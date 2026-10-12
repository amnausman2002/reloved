import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// Checks Firestore is reachable and the credentials work, the same way
// /api/health/gemini checks Vertex AI.
//
// Open it at http://localhost:3000/api/health/firebase. A healthy answer is
// {"ok":true,...}. If it fails with a credentials error, the laptop's login
// has expired: run `gcloud auth application-default login` again.
//
// Reads a document that does not exist on purpose. That still proves the
// project, the region and the credentials are all right, costs one read, and
// cannot be confused with real data.

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const snap = await adminDb().collection("_health").doc("ping").get();
    return NextResponse.json({
      ok: true,
      project: process.env.GOOGLE_CLOUD_PROJECT ?? null,
      reachable: true,
      // false is the expected answer: nothing has ever written this document.
      docExists: snap.exists,
      ms: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message, ms: Date.now() - started },
      { status: 500 },
    );
  }
}
