import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertWaitlistEntry } from "@/lib/data/waitlist";
import { EMAIL_PATTERN, INTENTS, nationalDigits, phoneError } from "@/app/waitlist/validation";
import { COUNTRY_CODES, PAKISTAN } from "@/app/waitlist/countries";

// POST /api/waitlist
//
// The only way into the waitlist collection: firestore.rules lets no browser
// read or write it. Answers { ok: true } for a new email and for one already
// on the list alike, so the form shows the same success either way.

/** Untrusted text from the URL. Kept, but capped, and blank becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => (value ? value.slice(0, max) : null));

const bodySchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).regex(EMAIL_PATTERN),
    /** Digits only, one of ours. Pakistan when missing. */
    country_code: z
      .string()
      .regex(/^\d{1,4}$/)
      .refine((code) => COUNTRY_CODES.has(code))
      .default(PAKISTAN.code),
    /** The number without its country code. Blank means none. */
    phone: z.string().max(30).nullish(),
    intent: z.enum(INTENTS),
  form_location: z.enum(["hero", "bottom"]),
  utm_source: optionalText(200),
  utm_medium: optionalText(200),
  utm_campaign: optionalText(200),
  referrer: optionalText(500),
    /** The honeypot. Hidden from people, so only a bot fills it in. */
    company: z.string().max(200).nullish(),
  })
  // Read under the chosen country's rules, then checked the same way the form
  // checks it. Stored as E.164: + country code + national digits.
  .transform((body) => ({
    ...body,
    phone: nationalDigits(body.phone ?? "", body.country_code),
  }))
  .refine((body) => phoneError(body.phone, body.country_code) === null);

// A brake on scripted signups, held in this server's memory like
// lib/ai/rateLimit.ts. Generous on purpose: mobile networks in Pakistan put
// many phones behind one address, and a real person must never hit this.
const SIGNUPS_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;
const recentByVisitor = new Map<string, number[]>();

function allowSignup(request: Request): boolean {
  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (recentByVisitor.get(visitor) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= SIGNUPS_PER_WINDOW) {
    recentByVisitor.set(visitor, recent);
    return false;
  }
  recent.push(now);
  recentByVisitor.set(visitor, recent);
  if (recentByVisitor.size > 5000) {
    for (const [key, times] of recentByVisitor) {
      if (times.every((time) => now - time >= WINDOW_MS)) recentByVisitor.delete(key);
    }
  }
  return true;
}

export async function POST(request: Request) {
  if (!allowSignup(request)) {
    console.warn("waitlist.limit visitor over the signup limit");
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let body;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  // A bot gets the same answer as a person, so it has no signal to adapt to.
  if (body.company) return NextResponse.json({ ok: true });

  try {
    await upsertWaitlistEntry({
      email: body.email,
      phone: body.phone ? `+${body.country_code}${body.phone}` : null,
      intent: body.intent,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      referrer: body.referrer,
      form_location: body.form_location,
    });
  } catch (error) {
    console.error("waitlist.save failed", error);
    return NextResponse.json({ ok: false, reason: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
