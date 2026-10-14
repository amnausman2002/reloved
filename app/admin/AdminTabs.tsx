"use client";

import { useState } from "react";
import AdminQueue from "./AdminQueue";
import AdminAccounts from "./AdminAccounts";
import type { QueueItem, AccountItem } from "@/lib/data/admin";

// The two things we check by hand, side by side: listings waiting for review,
// and the accounts behind them.
//
// Tabs rather than two pages, because they are the same job done twice: a
// listing is not trustworthy until its seller's number has answered on
// WhatsApp, so we move between them constantly. Both lists are fetched by the
// server page in one render, which is why switching is instant.
//
// NEW, 14 Oct. The tab row is the same `.tab-row`/`.tab-btn` pattern the
// seller profile already uses, so this introduces no new control.

type Tab = "listings" | "accounts";

type Props = {
  queue: QueueItem[];
  accounts: AccountItem[];
};

export default function AdminTabs({ queue, accounts }: Props) {
  const [tab, setTab] = useState<Tab>("listings");

  // Only the ones that need doing. A buyer has no number, and a number we have
  // already checked is not work.
  const waiting = accounts.filter((a) => a.phone !== null && !a.phone_verified).length;

  return (
    <>
      <div className="tab-row admin-tabs">
        <button
          type="button"
          className={`tab-btn${tab === "listings" ? " active" : ""}`}
          onClick={() => setTab("listings")}
        >
          <span>Listings</span>
          <span className="seller-box-sep" aria-hidden="true" />
          <span className="tab-btn-count">{queue.length}</span>
        </button>
        <button
          type="button"
          className={`tab-btn${tab === "accounts" ? " active" : ""}`}
          onClick={() => setTab("accounts")}
        >
          <span>Accounts</span>
          <span className="seller-box-sep" aria-hidden="true" />
          <span className="tab-btn-count">{waiting}</span>
        </button>
      </div>

      {tab === "listings" ? <AdminQueue items={queue} /> : <AdminAccounts items={accounts} />}
    </>
  );
}
