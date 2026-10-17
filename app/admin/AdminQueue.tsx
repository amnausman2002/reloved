"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FilterChip from "@/components/ui/FilterChip";
import Textarea from "@/components/ui/Textarea";
import {
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  REJECTION_REASON_MESSAGES,
  brandLabel,
  categoryLabel,
  cityLabel,
  CONDITIONS,
  type RejectionReason,
} from "@/lib/constants";
import type { QueueItem } from "@/lib/data/admin";
import type { ReviewResult } from "@/lib/ai/review";
import AiNotes, { type AiNotesState } from "./AiNotes";

/** Rows read at once. Each read is one Gemini call of about 5 to 13 seconds. */
const REVIEW_CONCURRENCY = 3;

// The queue rows, from components.html section 14, and the rejection modal
// from section 15.
//
// A client component because approving is interactive, but it holds no
// listing data of its own: everything is handed down from the server page, so
// a seller's phone number arrives already filtered to the rows we are allowed
// to see.
//
// Three things the static design does not have, all required by the PRD:
//   - the seller's other live listings beside each row, which is the
//     duplicate check at this scale
//   - a control to mark her number checked on WhatsApp, because that is how
//     phone_verified_at gets set now that there is no SMS code
//   - an empty state, since a queue with nothing in it is the normal state

function conditionLabel(value: string): string {
  return CONDITIONS.find((item) => item.value === value)?.label ?? value;
}

// How long she has been waiting is worded on the server, in lib/data/admin.ts,
// and arrives as item.waiting_label. Nothing in this file may read the clock:
// a value from Date.now() renders one way during the server render and
// another when the browser hydrates a moment later, which React reports as a
// hydration mismatch. It did exactly that here on 12 Oct.

/** WhatsApp's click-to-chat link. Digits only, no plus. Opening this is how we
 *  check the number is real before anything goes live. */
function whatsappLink(phone: string | null, title: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hi! This is Reloved. We're reviewing your listing "${title}". Just checking this number is on WhatsApp.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

type Props = { items: QueueItem[] };

export default function AdminQueue({ items }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<QueueItem | null>(null);
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState("");
  // Optimistic: a row that has been acted on disappears immediately rather
  // than after a round trip, because the next thing we do is read the row
  // below it.
  const [done, setDone] = useState<Record<string, true>>({});

  // AI notes per listing. Kept in this component, which stays mounted across
  // router.refresh(), so approving a row does not re-read every other row.
  // Nothing is stored: a full reload reads them again.
  const [aiNotes, setAiNotes] = useState<Record<string, AiNotesState>>({});
  const requestedRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef(0);

  function token(): string | null {
    const match = document.cookie.match(/(?:^|; )reloved_admin_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  const readNotes = useCallback(async (listingId: string) => {
    setAiNotes((current) => ({ ...current, [listingId]: { status: "loading" } }));
    const match = document.cookie.match(/(?:^|; )reloved_admin_token=([^;]*)/);
    const idToken = match ? decodeURIComponent(match[1]) : null;
    let result: ReviewResult | null = null;
    try {
      const response = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, listingId }),
      });
      result = (await response.json()) as ReviewResult;
    } catch {
      result = null;
    }
    setAiNotes((current) => ({
      ...current,
      [listingId]: result?.ok ? { status: "ready", notes: result.notes } : { status: "failed" },
    }));
  }, []);

  const pump = useCallback(() => {
    while (activeRef.current < REVIEW_CONCURRENCY && queueRef.current.length > 0) {
      const listingId = queueRef.current.shift()!;
      activeRef.current += 1;
      void readNotes(listingId).finally(() => {
        activeRef.current -= 1;
        pump();
      });
    }
  }, [readNotes]);

  // Oldest first, like the queue itself, so the notes arrive in reading order.
  useEffect(() => {
    for (const item of items) {
      if (requestedRef.current.has(item.id)) continue;
      requestedRef.current.add(item.id);
      queueRef.current.push(item.id);
    }
    pump();
  }, [items, pump]);

  async function post(body: Record<string, unknown>): Promise<boolean> {
    const idToken = token();
    if (!idToken) {
      setError("Your sign-in expired. Reload the page.");
      return false;
    }
    const response = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, idToken }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setError(result?.error ?? "That did not save.");
      return false;
    }
    return true;
  }

  async function approve(item: QueueItem) {
    setBusyId(item.id);
    setError(null);
    const ok = await post({ kind: "moderate", listingId: item.id, action: "approved", reason: null });
    setBusyId(null);
    if (ok) {
      setDone((current) => ({ ...current, [item.id]: true }));
      router.refresh();
    }
  }

  async function confirmReject() {
    if (!rejecting || !reason) return;
    setBusyId(rejecting.id);
    setError(null);
    const ok = await post({
      kind: "moderate",
      listingId: rejecting.id,
      action: "rejected",
      reason,
    });
    setBusyId(null);
    if (ok) {
      setDone((current) => ({ ...current, [rejecting.id]: true }));
      setRejecting(null);
      setReason(null);
      setNote("");
      router.refresh();
    }
  }

  async function markPhoneChecked(item: QueueItem) {
    setBusyId(item.id);
    setError(null);
    const ok = await post({ kind: "phone", sellerId: item.seller.id, verified: true });
    setBusyId(null);
    if (ok) router.refresh();
  }

  const visible = items.filter((item) => !done[item.id]);

  if (visible.length === 0) {
    return (
      <div className="admin-empty">
        <p className="text-h3">All caught up!</p>
        <p className="text-body-sm admin-empty-body">
          Nothing is waiting for review. New listings land here the moment a seller submits.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && <p className="input-error-msg admin-error">{error}</p>}

      <div className="queue-panel">
        {visible.map((item) => {
          const cover = item.photos.find((photo) => photo.is_cover) ?? item.photos[0];
          const link = whatsappLink(item.seller.phone, item.title);
          const busy = busyId === item.id;

          return (
            <div className="queue-row" key={item.id}>
              {cover ? (
                <img className="queue-cover" src={cover.url} alt="" />
              ) : (
                <div className="queue-cover" />
              )}

              <div>
                {item.is_replica && <span className="queue-flag">Declared replica</span>}

                <p className="queue-timestamp">Submitted {item.waiting_label}</p>
                <p className="queue-title">{item.title}</p>
                <p className="queue-details">
                  {[
                    categoryLabel(item.category as never),
                    item.size,
                    conditionLabel(item.condition),
                    brandLabel(item.brand as never),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="queue-price">Rs {item.asking_price.toLocaleString("en-PK")}</p>
                <p className="queue-seller-name">
                  {item.seller.display_name}, {cityLabel(item.city)}
                  {item.seller.sold_count > 0 && ` · ${item.seller.sold_count} sold`}
                </p>

                {item.description && <p className="queue-description">{item.description}</p>}

                <AiNotes
                  state={aiNotes[item.id]}
                  onRetry={() => {
                    queueRef.current.push(item.id);
                    pump();
                  }}
                />

                {/* Every photo, not just the cover. Opening a row to see them
                    full size is a later milestone; at six thumbnails this is
                    usually enough to judge. */}
                {item.photos.length > 1 && (
                  <div className="queue-thumbs">
                    {item.photos.map((photo) => (
                      <img key={photo.url} className="queue-thumb" src={photo.url} alt="" />
                    ))}
                  </div>
                )}

                {/* The duplicate check: her other live listings, right here. */}
                {item.other_live.length > 0 && (
                  <div className="queue-other">
                    <span className="queue-other-label">Also live from her</span>
                    <ul className="queue-other-list">
                      {item.other_live.map((other) => (
                        <li key={other.id}>
                          {other.title} &middot; Rs {other.asking_price.toLocaleString("en-PK")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="queue-col-actions">
                <button
                  type="button"
                  className="btn-sm btn-approve"
                  disabled={busy}
                  onClick={() => void approve(item)}
                >
                  {busy ? "Saving..." : "Approve"}
                </button>
                <button
                  type="button"
                  className="btn-sm btn-reject"
                  disabled={busy}
                  onClick={() => {
                    setRejecting(item);
                    setReason(null);
                    setNote("");
                  }}
                >
                  Reject
                </button>

                {link ? (
                  <a
                    className="queue-whatsapp-link"
                    href={link}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open WhatsApp
                  </a>
                ) : (
                  <span className="queue-no-phone">No number</span>
                )}

                {/* How phone_verified_at gets set now that there is no code.
                    Approving without this leaves her unverified, which is why
                    the unchecked state says so plainly. */}
                {item.seller.phone &&
                  (item.seller.phone_verified ? (
                    <span className="queue-phone-ok">Number checked</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-sm"
                      disabled={busy}
                      onClick={() => void markPhoneChecked(item)}
                    >
                      Mark number checked
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejection modal, components.html section 15. */}
      {rejecting && (
        <div
          className="modal-overlay is-fixed"
          role="dialog"
          aria-modal="true"
          aria-label="Reject this listing"
          onClick={() => setRejecting(null)}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={() => setRejecting(null)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <p className="modal-heading">Reject this listing</p>

            <label className="input-label">Reason</label>
            <div className="modal-reasons">
              {REJECTION_REASONS.map((value) => (
                <FilterChip
                  key={value}
                  active={reason === value}
                  onClick={() => setReason(value)}
                >
                  {REJECTION_REASON_LABELS[value]}
                </FilterChip>
              ))}
            </div>

            {/* What she will be told. Shown rather than composed, so we can see
                the message before sending it. The email itself is a later
                milestone: the Trigger Email extension is not installed. */}
            {reason && (
              <p className="modal-preview">
                {REJECTION_REASON_MESSAGES[reason]}
              </p>
            )}

            <Textarea
              label="Anything to add? (optional)"
              placeholder="Only if this listing needs something the reason above does not cover"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setRejecting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-destructive"
                disabled={!reason || busyId === rejecting.id}
                onClick={() => void confirmReject()}
              >
                {busyId === rejecting.id ? "Saving..." : "Reject listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
