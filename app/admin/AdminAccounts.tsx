"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cityLabel } from "@/lib/constants";
import type { AccountItem } from "@/lib/data/admin";

// The accounts list in the admin area. The second of the two things we check
// by hand: listings in one tab, the people behind them in this one.
//
// NEW, 14 Oct. components.html has no design for it, so every row is built
// from the queue row's shape next door. Flagged for Bismah.
//
// A client component because verifying is interactive, but it holds no data of
// its own: the rows arrive from the server page, already fetched with the
// Admin SDK. A seller's phone number never travels to a browser that is not
// ours, which is also why firestore.rules closes the users collection.
//
// MANUAL, AND MEANT TO BE FOR NOW. Checking a number is one of us opening its
// WhatsApp link and seeing a real account answer. When the WhatsApp Business
// account with Meta is approved, the message and the reply can be automated
// and this screen becomes a list of answers rather than a list of jobs. Until
// then, the button below says "I have checked this", not "verify".

/** WhatsApp's click-to-chat link. Digits only, no plus. Opening this is the
 *  check: if the number is not on WhatsApp, nothing happens at the other end. */
function whatsappLink(phone: string | null, name: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hi ${name}! This is Reloved. Just checking this number is on WhatsApp so buyers can reach you.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/** Spaced the way a Pakistani number is read aloud: +92 300 1234567. */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^92/, "");
  if (digits.length <= 3) return `+92 ${digits}`;
  return `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
}

type Props = { items: AccountItem[] };

export default function AdminAccounts({ items }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Optimistic, same as the queue: the row changes state immediately rather
  // than after a round trip, because the next thing we do is read the row
  // under it.
  const [done, setDone] = useState<Record<string, boolean>>({});

  function token(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)reloved_admin_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function setVerified(account: AccountItem, verified: boolean) {
    const idToken = token();
    if (!idToken) {
      setError("Your sign-in has expired. Reload the page and sign in again.");
      return;
    }

    setBusyId(account.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "phone", idToken, sellerId: account.id, verified }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "That did not save. Try again in a moment.");
        return;
      }
      setDone((current) => ({ ...current, [account.id]: verified }));
      // The queue beside this one shows the same verified flag next to each
      // seller, so it has to be refetched rather than left saying the opposite.
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="admin-empty">
        <p className="empty-state-heading">No accounts yet</p>
        <p className="empty-state-body">Everyone who signs up will appear here.</p>
      </div>
    );
  }

  return (
    <>
      {error && <p className="input-error-msg admin-error">{error}</p>}

      <ul className="admin-accounts">
        {items.map((account) => {
          const verified = done[account.id] ?? account.phone_verified;
          const link = whatsappLink(account.phone, account.display_name);
          const busy = busyId === account.id;

          return (
            <li key={account.id} className="account-row">
              <div className="account-row-main">
                <p className="account-row-name">
                  {account.display_name}
                  {/* A buyer is not an unfinished seller. She is never asked
                      for a number, so she is labelled rather than flagged. */}
                  {!account.phone && <span className="account-row-tag">Buyer</span>}
                  {account.phone && verified && (
                    <span className="account-row-tag account-row-tag-done">Checked</span>
                  )}
                </p>
                <p className="account-row-meta">
                  {account.email ?? "No email"}
                  {account.city ? ` · ${cityLabel(account.city as never)}` : ""}
                  {` · joined ${account.joined_label}`}
                  {` · ${account.listing_count} ${account.listing_count === 1 ? "listing" : "listings"}`}
                </p>

                {account.phone ? (
                  <p className="account-row-phone">
                    {formatPhone(account.phone)}
                    {link && (
                      <a
                        className="account-row-wa"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in WhatsApp
                      </a>
                    )}
                  </p>
                ) : (
                  <p className="account-row-phone account-row-phone-none">
                    No number. Nothing to check until she lists something.
                  </p>
                )}
              </div>

              {account.phone && (
                <div className="account-row-actions">
                  {verified ? (
                    <button
                      type="button"
                      className="btn-secondary admin-btn"
                      disabled={busy}
                      onClick={() => void setVerified(account, false)}
                    >
                      {busy ? "Saving..." : "Undo"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary admin-btn"
                      disabled={busy}
                      onClick={() => void setVerified(account, true)}
                    >
                      {busy ? "Saving..." : "I have checked this"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
