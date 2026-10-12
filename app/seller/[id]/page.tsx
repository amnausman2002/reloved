"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/ui/Nav";
import BrowseCard from "@/components/buyer/BrowseCard";
import StatusChip from "@/components/ui/StatusChip";
import TextLink from "@/components/ui/TextLink";
import { CITIES, REJECTION_REASON_LABELS } from "@/lib/constants";
import type { City } from "@/lib/constants";
import {
  getSeller,
  getSellerListings,
  getLiveListings,
  getSoldCount,
} from "@/lib/sample-data";
import type { MockListing } from "@/lib/sample-data";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Tab = "live" | "inReview" | "sold" | "closed";

function formatPrice(price: number): string {
  return `Rs ${price.toLocaleString("en")}`;
}

function cityLabel(city: City): string {
  return CITIES.find((c) => c.value === city)?.label ?? city;
}

function joinedLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return `Joined ${date.toLocaleDateString("en", { month: "short", year: "numeric" })}`;
}

// Lowercase: the avatar styles it in Fraunces as a decorative mark, not a
// literal initial, so it follows the display font's usual lowercase look
// rather than shouting like an upper-case monogram would.
function initials(name: string): string {
  return name.trim().charAt(0).toLowerCase() || "?";
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M24,128A72.08,72.08,0,0,1,96,56H204.69L194.34,45.66a8,8,0,0,1,11.32-11.32l24,24a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L204.69,72H96a56.06,56.06,0,0,0-56,56,8,8,0,0,1-16,0Zm200-8a8,8,0,0,0-8,8,56.06,56.06,0,0,1-56,56H51.31l10.35-10.34a8,8,0,0,0-11.32-11.32l-24,24a8,8,0,0,0,0,11.32l24,24a8,8,0,0,0,11.32-11.32L51.31,200H160a72.08,72.08,0,0,0,72-72A8,8,0,0,0,224,120Z" />
    </svg>
  );
}

// A compact management row: thumbnail, title, price (+ status chip, unless
// the tab it's in already says the status), an optional note (the rejection
// reason, the review line, the hidden explanation, or the view/contact
// count), and an optional trailing action.
function ListingRow({
  listing,
  showChip = true,
  note,
  action,
}: {
  listing: MockListing;
  showChip?: boolean;
  note?: string;
  action?: ReactNode;
}) {
  const cover = listing.photos.find((p) => p.isCover)?.url ?? listing.photos[0].url;
  return (
    <div className="listing-row">
      <Link href={`/item/${listing.id}`} className="listing-row-photo">
        <Image src={cover} alt={listing.title} width={112} height={144} sizes="56px" />
      </Link>
      <div className="listing-row-body">
        <Link href={`/item/${listing.id}`} className="listing-row-title">
          {listing.title}
        </Link>
        <div className="listing-row-price-line">
          <span className="listing-row-price">{formatPrice(listing.askingPrice)}</span>
          {showChip && <StatusChip status={listing.status} ownerView />}
        </div>
        {note && <p className="listing-row-meta">{note}</p>}
      </div>
      {action && <div className="listing-row-action">{action}</div>}
    </div>
  );
}

export default function SellerProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const seller = getSeller(id);
  const currentUser = useCurrentUser();
  const isOwner = Boolean(currentUser && seller && currentUser.id === seller.id);

  const [tab, setTab] = useState<Tab>("live");
  const [listings, setListings] = useState<MockListing[]>(() =>
    seller ? getSellerListings(seller.id) : []
  );

  if (!seller) {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }}>
          <p className="text-body">Seller not found.</p>
        </main>
      </>
    );
  }

  function markSold(listingId: string) {
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, status: "sold" as const } : l))
    );
  }

  // Expired only — a hidden listing only ever came from two unresolved
  // reports or one of us acting, so there's nothing for her to do but wait.
  function relist(listingId: string) {
    const today = new Date().toISOString().slice(0, 10);
    setListings((prev) =>
      prev.map((l) =>
        l.id === listingId
          ? { ...l, status: "live" as const, createdAt: today, viewCount: 0, contactCount: 0 }
          : l
      )
    );
  }

  const liveListings = isOwner
    ? listings.filter((l) => l.status === "live")
    : getLiveListings(seller.id);
  const soldListings = isOwner ? listings.filter((l) => l.status === "sold") : [];
  const soldCount = isOwner ? soldListings.length : getSoldCount(seller.id);
  const needsAttention = isOwner ? listings.filter((l) => l.status === "rejected") : [];
  const underReview = isOwner ? listings.filter((l) => l.status === "pending") : [];
  const expiredListings = isOwner ? listings.filter((l) => l.status === "expired") : [];
  const hiddenListings = isOwner ? listings.filter((l) => l.status === "hidden") : [];
  const inReviewListings = [...needsAttention, ...underReview];
  const closedListings = [...expiredListings, ...hiddenListings];

  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: "var(--space-5)", paddingBottom: "var(--space-8)" }}>
        <div className="seller-profile-header">
          <div className="seller-avatar" aria-hidden="true">
            {initials(seller.displayName)}
          </div>
          <div className="seller-info">
            <div className="seller-name-row">
              <span className="seller-profile-name">{seller.displayName}</span>
              {isOwner && (
                <Link
                  href={`/seller/${seller.id}/edit`}
                  className="seller-edit-btn"
                  aria-label="Edit profile"
                >
                  <EditIcon />
                </Link>
              )}
            </div>
            <span className="seller-meta">
              {cityLabel(seller.city)} · {joinedLabel(seller.createdAt)}
            </span>
          </div>
        </div>

        {seller.bio && <p className="seller-profile-bio">{seller.bio}</p>}

        {!isOwner && (
          <p className="seller-profile-stats">
            {liveListings.length} {liveListings.length === 1 ? "item" : "items"} for sale
            {soldCount > 1 && ` · ${soldCount} sold`}
          </p>
        )}

        {isOwner ? (
          <>
            <div className="tab-row">
              <button
                type="button"
                className={`tab-btn${tab === "live" ? " active" : ""}`}
                onClick={() => setTab("live")}
              >
                <span>Live</span>
                <span className="seller-box-sep" aria-hidden="true" />
                <span className="tab-btn-count">{liveListings.length}</span>
              </button>
              <button
                type="button"
                className={`tab-btn${tab === "inReview" ? " active" : ""}`}
                onClick={() => setTab("inReview")}
              >
                <span>In review</span>
                <span className="seller-box-sep" aria-hidden="true" />
                <span className="tab-btn-count">{inReviewListings.length}</span>
              </button>
              <button
                type="button"
                className={`tab-btn${tab === "sold" ? " active" : ""}`}
                onClick={() => setTab("sold")}
              >
                <span>Sold</span>
                <span className="seller-box-sep" aria-hidden="true" />
                <span className="tab-btn-count">{soldListings.length}</span>
              </button>
              <button
                type="button"
                className={`tab-btn${tab === "closed" ? " active" : ""}`}
                onClick={() => setTab("closed")}
              >
                <span>Closed</span>
                <span className="seller-box-sep" aria-hidden="true" />
                <span className="tab-btn-count">{closedListings.length}</span>
              </button>
            </div>

            {tab === "live" &&
              (liveListings.length > 0 ? (
                liveListings.map((l) => (
                  <ListingRow
                    key={l.id}
                    listing={l}
                    showChip={false}
                    note={`${l.viewCount} views · ${l.contactCount} contacts`}
                    action={
                      <TextLink className="listing-row-action-link" onClick={() => markSold(l.id)}>
                        Mark as sold <CheckIcon />
                      </TextLink>
                    }
                  />
                ))
              ) : (
                <div className="empty-state">
                  <p className="empty-state-heading">Nothing live right now</p>
                </div>
              ))}

            {tab === "inReview" &&
              (inReviewListings.length > 0 ? (
                inReviewListings.map((l) => (
                  <ListingRow
                    key={l.id}
                    listing={l}
                    showChip={l.status !== "rejected"}
                    note={
                      l.status === "rejected"
                        ? l.rejectionReason
                          ? REJECTION_REASON_LABELS[l.rejectionReason]
                          : undefined
                        : "We'll get back to you within a day"
                    }
                    action={
                      l.status === "rejected" ? (
                        <TextLink className="listing-row-action-link" href={`/item/${l.id}`}>
                          Make changes
                        </TextLink>
                      ) : undefined
                    }
                  />
                ))
              ) : (
                <div className="empty-state">
                  <p className="empty-state-heading">Nothing in review</p>
                </div>
              ))}

            {tab === "sold" &&
              (soldListings.length > 0 ? (
                soldListings.map((l) => <ListingRow key={l.id} listing={l} showChip={false} />)
              ) : (
                <div className="empty-state">
                  <p className="empty-state-heading">Nothing sold yet</p>
                </div>
              ))}

            {tab === "closed" &&
              (closedListings.length > 0 ? (
                closedListings.map((l) => (
                  <ListingRow
                    key={l.id}
                    listing={l}
                    note={l.status === "hidden" ? "Taken down, under review" : undefined}
                    action={
                      l.status === "expired" ? (
                        <TextLink className="listing-row-action-link" onClick={() => relist(l.id)}>
                          Relist <RepeatIcon />
                        </TextLink>
                      ) : undefined
                    }
                  />
                ))
              ) : (
                <div className="empty-state">
                  <p className="empty-state-heading">Nothing closed</p>
                </div>
              ))}
          </>
        ) : liveListings.length > 0 ? (
          <div className="browse-grid seller-profile-grid" style={{ marginTop: "var(--space-5)" }}>
            {liveListings.map((l) => (
              <BrowseCard
                key={l.id}
                id={l.id}
                title={l.title}
                brand={l.brand}
                brandOther={l.brandOther}
                category={l.category}
                askingPrice={l.askingPrice}
                coverPhoto={l.photos.find((p) => p.isCover)?.url ?? l.photos[0].url}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-heading">No items for sale yet</p>
          </div>
        )}
      </main>
    </>
  );
}
