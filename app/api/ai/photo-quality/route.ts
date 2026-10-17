import { NextResponse } from "next/server";
import { runPhotoQuality } from "@/lib/ai/photo-quality";
import { allowAiCall } from "@/lib/ai/rateLimit";

// No sign-in check or App Check yet (milestone M6). allowAiCall is the
// temporary spending brake in the meantime.
export const runtime = "nodejs";

// Always 200: this check is advisory and must never look like a broken page.
export async function POST(request: Request) {
  if (!allowAiCall(request)) {
    return NextResponse.json({ ok: true, flags: [], skipped: true });
  }

  let photos: File[] = [];

  try {
    const form = await request.formData();
    photos = form.getAll("photos").filter((value): value is File => value instanceof File);
  } catch {
    return NextResponse.json({ ok: true, flags: [], skipped: true });
  }

  return NextResponse.json(await runPhotoQuality({ photos }));
}
