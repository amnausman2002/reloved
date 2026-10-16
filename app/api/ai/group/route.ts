import { NextResponse } from "next/server";
import { z } from "zod";
import { runGroup } from "@/lib/ai/group";
import type { PhotoMeta } from "@/lib/ai/groupRules";

// POST /api/ai/group — bulk listing, Call 3.
// Multipart: `photos` (2 to 30 thumbnails, in the order she picked them) and
// `meta`, a JSON array of { name, lastModified } in the same order.
//
// No sign-in check, App Check or rate limit yet. Laptop only until milestone M6.
export const runtime = "nodejs";

const metaSchema = z.array(
  z.object({
    name: z.string().max(200),
    lastModified: z.number(),
  }),
);

/** Bad or missing meta is not worth refusing the request over: grouping then
 *  runs on the photos and their order alone. */
function readMeta(value: FormDataEntryValue | null): PhotoMeta[] | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = metaSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
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
  const result = await runGroup({ photos, meta: readMeta(form.get("meta")) });

  // An AI failure returns 200, like the other AI routes: the browser offers
  // Try again and Sort them myself, and nothing is broken.
  if (!result.ok && result.reason === "input") {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
