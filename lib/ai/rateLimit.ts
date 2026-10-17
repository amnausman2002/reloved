// A spending brake for the Gemini routes, until milestone M6 (App Check and
// per-user limits in Firestore) replaces it.
//
// Two limits, both kept in this server's memory:
//   - per visitor: AI_CALLS_PER_WINDOW calls per AI_WINDOW_MS, by IP address
//   - per server:  AI_CALLS_PER_DAY in total, reset at midnight UTC
//
// Memory resets when App Hosting restarts or adds a server, so this is a
// brake, not a lock. apphosting.yaml caps the servers at 2, which is what
// makes the daily figure a real ceiling: at most twice this per day.
//
// Going over never shows as an error. Each route treats it exactly like the
// model being unavailable, so the seller's flow carries on without AI, as
// CLAUDE.md's AI rule requires.

/** A ten-item bulk batch is about 21 calls (1 grouping, then 2 per card). */
const AI_CALLS_PER_WINDOW = 60;
const AI_WINDOW_MS = 10 * 60 * 1000;
const AI_CALLS_PER_DAY = 1500;

const recentByVisitor = new Map<string, number[]>();
let today = "";
let callsToday = 0;

/** App Hosting puts the visitor's address first in x-forwarded-for. */
function visitorOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** True when this request may call Gemini. Counts it if so. */
export function allowAiCall(request: Request): boolean {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  if (day !== today) {
    today = day;
    callsToday = 0;
  }
  if (callsToday >= AI_CALLS_PER_DAY) {
    console.warn(`ai.limit daily ceiling reached (${AI_CALLS_PER_DAY})`);
    return false;
  }

  const visitor = visitorOf(request);
  const recent = (recentByVisitor.get(visitor) ?? []).filter((time) => now - time < AI_WINDOW_MS);
  if (recent.length >= AI_CALLS_PER_WINDOW) {
    recentByVisitor.set(visitor, recent);
    console.warn(`ai.limit visitor over ${AI_CALLS_PER_WINDOW} calls in 10 min`);
    return false;
  }

  recent.push(now);
  recentByVisitor.set(visitor, recent);
  callsToday += 1;

  // Keep the map from growing for ever on a long-lived server.
  if (recentByVisitor.size > 5000) {
    for (const [key, times] of recentByVisitor) {
      if (times.every((time) => now - time >= AI_WINDOW_MS)) recentByVisitor.delete(key);
    }
  }
  return true;
}

export const LIMITED_MESSAGE = "Too many requests just now.";
