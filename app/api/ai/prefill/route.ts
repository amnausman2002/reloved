import { NextResponse } from "next/server";
import { runPrefill } from "@/lib/ai/prefill";
import { allowAiCall, LIMITED_MESSAGE } from "@/lib/ai/rateLimit";

// No sign-in check or App Check yet (milestone M6). allowAiCall is the
// temporary spending brake in the meantime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Over the limit looks like the model being unavailable: she fills it in.
  if (!allowAiCall(request)) {
    return NextResponse.json({ ok: false, reason: "ai", error: LIMITED_MESSAGE });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Send the photos as multipart form data." },
      { status: 400 },
    );
  }

  const photos = form.getAll("photos").filter((value): value is File => value instanceof File);

  const result = await runPrefill({ photos });

  // A bad request is the caller's mistake, so it gets a 400. An AI failure
  // returns 200: the seller keeps filling the form by hand, nothing is broken.
  if (!result.ok && result.reason === "input") {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
