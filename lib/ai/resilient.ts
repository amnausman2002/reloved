// Getting an answer out of Gemini when its speed varies, and saying how it
// went in a form Google Cloud can count.
//
// Two ideas, both from how Google runs its own services:
//
// 1. Hedged requests ("The Tail at Scale", Dean and Barroso, 2013). Most
//    calls answer in a few seconds; a few take three or four times as long,
//    and on 18 Oct those few were hitting 504 DEADLINE_EXCEEDED and leaving a
//    seller with an empty form. So: start the full request; if it has not
//    answered by HEDGE_AFTER_MS, start a second, lighter one beside it and take
//    whichever answers first. The loser is cancelled. The extra cost is paid
//    only on the slow calls, which are the ones it rescues.
//
// 2. A fallback tier. If the full request fails outright (timeout, overload)
//    the light one starts at once rather than waiting for the hedge. The light
//    tier asks the same question of smaller images, so it is quicker, and its
//    answer passes through exactly the same Zod check and server rules.
//
// Rate limits (429) and brief unavailability (503) are retried by the Gen AI
// library itself with a growing, jittered wait, inside each tier.
//
// Every call ends with one JSON line on stdout. Cloud Run turns that into a
// structured log entry, so latency, token use, which tier answered and how
// often we fell back can be filtered and charted in Cloud Logging with no
// extra service: jsonPayload.ai_call="prefill" AND jsonPayload.outcome="ok".

import { MediaResolution, type HttpRetryOptions } from "@google/genai";

/** When the light request joins the full one. About the median full-call
 *  time we measured, so roughly the slower half of calls get a hedge. */
export const HEDGE_AFTER_MS = 8_000;

export const RETRY_429_503: HttpRetryOptions = {
  attempts: 2,
  initialDelay: 1,
  maxDelay: 4,
  httpStatusCodes: [429, 503],
};

export type Tier = {
  name: "full" | "light";
  mediaResolution: MediaResolution;
  timeoutMs: number;
};

export type AiCallName = "prefill" | "photo_quality" | "group" | "review" | "duplicate";

export type AiLog = {
  ai_call: AiCallName;
  outcome: "ok" | "failed" | "invalid";
  ms: number;
  tier?: Tier["name"];
  /** True when the light request had to start, by hedge or by fallback. */
  hedged?: boolean;
  photos?: number;
  tokens_in?: number;
  tokens_out?: number;
  error?: string;
  [extra: string]: unknown;
};

/** One structured log line per AI call. */
export function logAi(entry: AiLog): void {
  const severity = entry.outcome === "ok" ? "INFO" : "WARNING";
  console.log(JSON.stringify({ severity, message: `ai.${entry.ai_call} ${entry.outcome}`, ...entry }));
}

export type TieredResult<T> = { value: T; tier: Tier["name"]; hedged: boolean };

/** Runs `attempt` on the full tier, hedged by the light tier.
 *
 *  Resolves with the first tier to answer. Rejects only when both have
 *  failed, with the full tier's error, so the caller's own fallback (an empty
 *  form, a skipped check) still applies. `attempt` must pass the signal on to
 *  the request so the losing tier is really cancelled, not just ignored. */
export function runTiered<T>(
  full: Tier,
  light: Tier,
  attempt: (tier: Tier, signal: AbortSignal) => Promise<T>,
): Promise<TieredResult<T>> {
  return new Promise((resolve, reject) => {
    const controllers = { full: new AbortController(), light: new AbortController() };
    let settled = false;
    let lightStarted = false;
    let fullError: unknown = null;
    let failures = 0;

    const finish = (tier: Tier["name"], value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      // Cancel whichever is still running.
      controllers[tier === "full" ? "light" : "full"].abort();
      resolve({ value, tier, hedged: lightStarted });
    };

    const fail = (tier: Tier["name"], error: unknown) => {
      if (settled) return;
      if (tier === "full") fullError = error;
      failures += 1;
      if (tier === "full" && !lightStarted) {
        startLight();
        return;
      }
      if (failures >= 2) {
        settled = true;
        clearTimeout(hedgeTimer);
        reject(fullError ?? error);
      }
    };

    const startLight = () => {
      if (lightStarted || settled) return;
      lightStarted = true;
      attempt(light, controllers.light.signal).then(
        (value) => finish("light", value),
        (error) => fail("light", error),
      );
    };

    const hedgeTimer = setTimeout(startLight, HEDGE_AFTER_MS);
    attempt(full, controllers.full.signal).then(
      (value) => finish("full", value),
      (error) => fail("full", error),
    );
  });
}

/** Gemini's errors carry an HTTP status; a cancelled request does not. */
export function errorLabel(error: unknown): string {
  if (typeof error === "object" && error !== null && "status" in error) {
    return `status ${(error as { status: unknown }).status}`;
  }
  return error instanceof Error ? error.name : "unknown";
}
