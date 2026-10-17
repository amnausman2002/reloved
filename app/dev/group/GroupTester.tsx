"use client";

// Throwaway test page for the bulk grouping call. Pick up to 30 photos from a
// phone or laptop and see how the AI sorts them, with the numbers that matter:
// time, tokens, whether capture times were used, and what had to be repaired.
// "Sort them myself" shows the no-AI fallback on the same photos.

import { useState, type CSSProperties } from "react";
import { prepareThumbnails } from "@/lib/photos";
import { GROUP_THUMB_EDGE, groupByTime, timesAreTrustworthy, type PhotoGroup, type PhotoMeta } from "@/lib/ai/groupRules";
import { MAX_BATCH_PHOTOS } from "@/lib/constants";

type GroupResponse =
  | {
      ok: true;
      groups: PhotoGroup[];
      timesUsed: boolean;
      repairs: { dropped: number; orphans: number };
      latencyMs: number;
      tokens: { prompt?: number; output?: number; thoughts?: number };
    }
  | { ok: false; error: string };

const mono: CSSProperties = { fontFamily: "ui-monospace, monospace" };

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString();
}

export default function GroupTester() {
  const [thumbs, setThumbs] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [meta, setMeta] = useState<PhotoMeta[]>([]);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<GroupResponse | null>(null);
  const [fallback, setFallback] = useState<PhotoGroup[] | null>(null);
  const [waitMs, setWaitMs] = useState<number | null>(null);

  async function pick(list: FileList | null) {
    if (!list || list.length === 0) return;
    urls.forEach((url) => URL.revokeObjectURL(url));
    setResult(null);
    setFallback(null);

    const all = Array.from(list);
    const files = all.slice(0, MAX_BATCH_PHOTOS);
    setNote(all.length > MAX_BATCH_PHOTOS ? `Kept the first ${MAX_BATCH_PHOTOS} of ${all.length} photos.` : "");

    // Captured from the originals: resizing makes new files and loses both.
    setMeta(files.map((file) => ({ name: file.name, lastModified: file.lastModified })));

    const started = Date.now();
    setProgress(`Preparing 0 of ${files.length}`);
    const prepared = await prepareThumbnails(files, GROUP_THUMB_EDGE, (done) =>
      setProgress(`Preparing ${done} of ${files.length}`),
    );
    const ready = prepared.map((photo) => photo.file);
    const kb = Math.round(ready.reduce((sum, file) => sum + file.size, 0) / 1024);
    setProgress(`Prepared ${files.length} thumbnails in ${Date.now() - started} ms, ${kb} KB in total`);
    setThumbs(ready);
    setUrls(ready.map((file) => URL.createObjectURL(file)));
  }

  async function group() {
    setResult(null);
    setFallback(null);
    const form = new FormData();
    thumbs.forEach((file) => form.append("photos", file, file.name));
    form.append("meta", JSON.stringify(meta));
    const started = Date.now();
    setWaitMs(0);
    const timer = setInterval(() => setWaitMs(Date.now() - started), 250);
    try {
      const response = await fetch("/api/ai/group", { method: "POST", body: form });
      setResult((await response.json()) as GroupResponse);
    } catch {
      setResult({ ok: false, error: "Could not reach the server." });
    } finally {
      clearInterval(timer);
      setWaitMs(Date.now() - started);
    }
  }

  function strip(groups: PhotoGroup[]) {
    return groups.map((g, gi) => (
      <div key={gi} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 10 }}>
        <div style={{ ...mono, fontSize: 13, marginBottom: 6 }}>
          Card {gi + 1} · {g.photos.length} photo{g.photos.length === 1 ? "" : "s"}
          {g.itemHint ? ` · ${g.itemHint}` : ""}
          {g.photos.length < 2 ? " · needs another photo" : g.photos.length > 6 ? " · too many photos" : ""}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {g.photos.map((p) => (
            <figure key={p} style={{ margin: 0, textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[p]} alt="" style={{ width: 84, height: 84, objectFit: "cover" }} />
              <figcaption style={{ ...mono, fontSize: 11, color: "#666" }}>#{p}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    ));
  }

  const trusted = meta.length > 0 && timesAreTrustworthy(meta);

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Grouping tester</h1>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Pick up to {MAX_BATCH_PHOTOS} photos of several items, in the order you took them. Development only.
      </p>

      <input type="file" accept="image/*" multiple onChange={(e) => pick(e.target.files)} />
      {note && <p style={{ color: "#a60" }}>{note}</p>}
      {progress && <p style={{ ...mono, fontSize: 13, color: "#444" }}>{progress}</p>}

      {thumbs.length > 0 && (
        <>
          <p style={{ ...mono, fontSize: 13, color: "#444" }}>
            Capture times look {trusted ? "trustworthy" : "untrustworthy, so the model will get order only"}.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
            {urls.map((url, i) => (
              <figure key={url} style={{ margin: 0, textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover" }} />
                <figcaption style={{ ...mono, fontSize: 10, color: "#666" }}>
                  #{i} {clock(meta[i].lastModified)}
                </figcaption>
              </figure>
            ))}
          </div>
          <button onClick={group} disabled={waitMs !== null && !result} style={{ padding: "8px 14px", marginRight: 8 }}>
            Group with AI
          </button>
          <button onClick={() => { setResult(null); setFallback(groupByTime(meta)); }} style={{ padding: "8px 14px" }}>
            Sort them myself (no AI)
          </button>
          {waitMs !== null && !result && <p style={{ ...mono }}>Waiting… {(waitMs / 1000).toFixed(1)}s</p>}
        </>
      )}

      {result && !result.ok && <p style={{ color: "#b00" }}>Failed: {result.error}</p>}

      {result?.ok && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16 }}>AI grouping: {result.groups.length} cards</h2>
          <p style={{ ...mono, fontSize: 13, color: "#444" }}>
            {result.latencyMs} ms on the server · {waitMs} ms round trip · tokens in {result.tokens.prompt ?? "?"} · out{" "}
            {result.tokens.output ?? "?"} · times used: {String(result.timesUsed)} · repaired: {result.repairs.dropped} dropped,{" "}
            {result.repairs.orphans} left out
          </p>
          {strip(result.groups)}
        </section>
      )}

      {fallback && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16 }}>No-AI fallback: {fallback.length} cards</h2>
          <p style={{ ...mono, fontSize: 13, color: "#444" }}>
            {trusted ? "Split wherever photos are more than 90 seconds apart." : "Times untrustworthy, so one photo per card."}
          </p>
          {strip(fallback)}
        </section>
      )}
    </main>
  );
}
