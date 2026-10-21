"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/ui/Nav";
import BrowseCard from "@/components/buyer/BrowseCard";
import StatusChip from "@/components/ui/StatusChip";
import TextLink from "@/components/ui/TextLink";
import { CITIES, REJECTION_REASON_LABELS } from "@/lib/constants";
import type { City } from "@/lib/constants";
import { useAuthUser, sellerFromAuth, type ProfileSeller } from "@/lib/useAuthUser";
import {
  fetchMySellerData,
  markSold,
  markUnsold,
  type MySellerData,
  type MyListing,
} from "@/lib/myListings";
import { fetchPublicSeller, type PublicSeller } from "@/lib/fetchSeller";
import { isRemotePhoto } from "@/lib/photoUrl";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { loadDraft, type LoadedDraft } from "@/app/sell/draft";

// CHANGED 21 Oct: "Closed" became "Drafts". Expired and hidden listings, which
// were all Closed held, moved into In review with their notes unchanged:
// hidden ones are literally under review, and nothing expires on its own yet.
type Tab = "live" | "inReview" | "sold" | "drafts";

type ProfileListing = MyListing;

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

/** "2 hours ago". Rough on purpose: she needs to recognise the draft, not
 *  audit it. */
function savedAgo(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** The listing she started on this phone and has not posted
 *  (app/sell/draft.ts). Same row shape as a listing, with a plain <img>
 *  because the cover is a local object URL, not a Cloud Storage photo.
 *  NEW, no design in components.html. Flagged for Bismah. */
function DraftRow({ loaded, coverUrl }: { loaded: LoadedDraft; coverUrl: string | null }) {
  const { draft } = loaded;
  const title =
    draft.kind === "single"
      ? draft.fields.title.trim() || "Untitled listing"
      : `${draft.cards.length} listing${draft.cards.length === 1 ? "" : "s"}`;
  const photos = draft.photos.length;
  return (
    <div className="listing-row">
      <Link href="/sell?resume=1" className="listing-row-photo">
        {coverUrl ? <img src={coverUrl} alt="" /> : null}
      </Link>
      <div className="listing-row-body">
        <Link href="/sell?resume=1" className="listing-row-title">
          {title}
        </Link>
        <p className="listing-row-meta">
          {photos} photo{photos === 1 ? "" : "s"} · Saved on this phone {savedAgo(loaded.savedAt)}
        </p>
      </div>
      <div className="listing-row-action">
        <TextLink className="listing-row-action-link" href="/sell?resume=1">
          Continue
        </TextLink>
      </div>
    </div>
  );
}

/** The shape of a listing row, while her listings are being read.
 *
 *  Drawn rather than saying "Loading", so the page does not jump when the real
 *  rows arrive and she can see what is coming. */
function ListingRowSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading your listings">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton skeleton-thumb" />
          <div className="skeleton-lines">
            <div className="skeleton skeleton-line skeleton-line-title" />
            <div className="skeleton skeleton-line skeleton-line-price" />
            <div className="skeleton skeleton-line skeleton-line-meta" />
          </div>
        </div>
      ))}
    </div>
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
  listing: ProfileListing;
  showChip?: boolean;
  note?: string;
  action?: ReactNode;
}) {
  // A real listing always has photos, since the server refuses fewer than two.
  // Tolerated anyway: an empty row is better than a page that throws.
  const cover = listing.photos.find((p) => p.isCover)?.url ?? listing.photos[0]?.url;
  return (
    <div className="listing-row">
      <Link href={`/item/${listing.id}`} className="listing-row-photo">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            width={112}
            height={144}
            sizes="56px"
            unoptimized={isRemotePhoto(cover)}
          />
        ) : null}
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
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuthUser();

  /** Whether this is her own profile. Nobody until Firebase has answered:
   *  guessing would flash the wrong view at her. */
  const isOwner = !authLoading && authUser?.uid === id;

  // Two different reads, because they are two different things.
  //
  // Her own profile needs every listing at every status and her saved number,
  // and the route answers only for the account that asked. Everyone else's is
  // the public view: name, city, bio, sold count, and whatever is live.
  const [mine, setMine] = useState<MySellerData | null>(null);
  const [loadingMine, setLoadingMine] = useState(false);
  const [publicView, setPublicView] = useState<PublicSeller | null>(null);
  const [publicState, setPublicState] = useState<"loading" | "missing" | "error" | "found">(
    "loading",
  );
  /** The listing currently being marked sold, so only its own row spins. */
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let live = true;

    if (isOwner) {
      setLoadingMine(true);
      void fetchMySellerData().then((data) => {
        if (!live) return;
        setMine(data);
        setLoadingMine(false);
      });
    } else {
      void fetchPublicSeller(id).then((result) => {
        if (!live) return;
        if (result.status === "found") {
          setPublicView(result.seller);
          setPublicState("found");
        } else {
          setPublicState(result.status);
        }
      });
    }

    return () => {
      live = false;
    };
  }, [authLoading, isOwner, id]);

  // What Firestore says wins, because it has her real name, city and bio. The
  // account from Auth is the stand-in until it lands, so her own page has a
  // heading to draw straight away rather than a blank.
  const seller: ProfileSeller | undefined = mine
    ? {
        id: mine.profile.id,
        displayName: mine.profile.displayName,
        city: mine.profile.city,
        bio: mine.profile.bio ?? undefined,
        createdAt: mine.profile.createdAt,
      }
    : publicView
      ? {
          id: publicView.id,
          displayName: publicView.displayName,
          city: publicView.city,
          bio: publicView.bio ?? undefined,
          createdAt: publicView.createdAt,
        }
      : isOwner && authUser
        ? sellerFromAuth(authUser)
        : undefined;

  const [tab, setTab] = useState<Tab>("live");

  // Her unfinished listing, if this phone has one that is hers. Drafts live on
  // the phone, not in Firestore, so this is at most one and only ever here.
  const [draft, setDraft] = useState<LoadedDraft | null>(null);
  const [draftCover, setDraftCover] = useState<string | null>(null);
  useEffect(() => {
    if (!isOwner) return;
    let live = true;
    let url: string | null = null;
    void loadDraft().then(({ loaded }) => {
      if (!live || !loaded) return;
      // Made signed out counts as hers: she is the one signed in now.
      if (loaded.ownerUid && loaded.ownerUid !== authUser?.uid) return;
      const coverId =
        loaded.draft.kind === "single"
          ? (loaded.draft.coverId ?? loaded.draft.photos[0]?.id)
          : loaded.draft.cards[0]?.photoIds[0];
      const file = coverId ? loaded.files[coverId]?.file : undefined;
      if (file) url = URL.createObjectURL(file);
      setDraft(loaded);
      setDraftCover(url);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOwner, authUser?.uid]);

  const listings: ProfileListing[] = mine?.listings ?? [];

  if (!seller) {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }}>
          {/* Nothing while the session is still being restored, or while her
              profile is on its way: telling someone she does not exist and
              then correcting it is worse than a blank. */}
          {!authLoading && publicState === "missing" && (
            <p className="text-body">Seller not found.</p>
          )}
          {!authLoading && publicState === "error" && (
            <p className="text-body">We could not load this profile. Check your connection.</p>
          )}
        </main>
      </>
    );
  }

  /** Firestore first, and the row only moves if it actually changed. Browse is
   *  corrected at the same time, because it shows live only and the cached copy
   *  is dropped by markSold/markUnsold. */
  async function move(listingId: string, to: "sold" | "live") {
    setSellingId(listingId);
    setSellError(null);
    const ok = to === "sold" ? await markSold(listingId) : await markUnsold(listingId);
    setSellingId(null);

    if (!ok) {
      setSellError(
        to === "sold"
          ? "We could not mark that as sold. Try again in a moment."
          : "We could not put that back. Try again in a moment.",
      );
      return;
    }
    setMine((current) =>
      current
        ? {
            ...current,
            listings: current.listings.map((l) => (l.id === listingId ? { ...l, status: to } : l)),
          }
        : current,
    );
  }

  const liveListings = listings.filter((l) => l.status === "live");
  const soldListings = listings.filter((l) => l.status === "sold");
  const soldCount = isOwner ? soldListings.length : (publicView?.soldCount ?? 0);
  const needsAttention = listings.filter((l) => l.status === "rejected");
  const underReview = listings.filter((l) => l.status === "pending");
  const expiredListings = listings.filter((l) => l.status === "expired");
  const hiddenListings = listings.filter((l) => l.status === "hidden");
  const inReviewListings = [...needsAttention, ...underReview, ...hiddenListings, ...expiredListings];
  // What a buyer sees: her live listings, as cards.
  const publicListings = publicView?.listings ?? [];

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
            {/* A brand new account has not told us her city yet, so the dot
                and the city both drop rather than reading "undefined ·". */}
            <span className="seller-meta">
              {seller.city ? `${cityLabel(seller.city)} · ` : ""}
              {joinedLabel(seller.createdAt)}
            </span>
          </div>
        </div>

        {seller.bio && <p className="seller-profile-bio">{seller.bio}</p>}

        {!isOwner && (
          <p className="seller-profile-stats">
            {publicListings.length} {publicListings.length === 1 ? "item" : "items"} for sale
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
                className={`tab-btn${tab === "drafts" ? " active" : ""}`}
                onClick={() => setTab("drafts")}
              >
                <span>Drafts</span>
                <span className="seller-box-sep" aria-hidden="true" />
                <span className="tab-btn-count">{draft ? 1 : 0}</span>
              </button>
            </div>

            {/* Shown above the rows rather than inside one, because the row it
                belongs to may have moved to Sold by the time she reads it. */}
            {sellError && <p className="input-error-msg">{sellError}</p>}

            {tab === "live" &&
              (liveListings.length > 0 ? (
                liveListings.map((l) => (
                  <ListingRow
                    key={l.id}
                    listing={l}
                    showChip={false}
                    note={`${l.viewCount} views · ${l.contactCount} contacts`}
                    action={
                      <TextLink
                        className="listing-row-action-link"
                        disabled={sellingId === l.id}
                        onClick={() => move(l.id, "sold")}
                      >
                        {sellingId === l.id ? (
                          <>
                            <span className="btn-spinner btn-spinner-inline" aria-hidden="true" />
                            Marking sold...
                          </>
                        ) : (
                          <>
                            Mark as sold <CheckIcon />
                          </>
                        )}
                      </TextLink>
                    }
                  />
                ))
              ) : loadingMine ? (
                <ListingRowSkeleton rows={2} />
              ) : listings.length === 0 ? (
                // She has never listed anything, which is every seller who has
                // just made an account. The empty state from components.html
                // section 21, with its CTA, because "Nothing live right now"
                // on an empty profile is a dead end rather than an answer.
                <div className="empty-state">
                  <p className="empty-state-heading">Your first listing goes here</p>
                  <p className="empty-state-body">
                    Take a few photos of something you no longer wear. We fill in the details.
                  </p>
                  <div className="empty-state-cta">
                    <PrimaryButton onClick={() => router.push("/sell")}>
                      List your first item
                    </PrimaryButton>
                  </div>
                </div>
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
                        : l.status === "hidden"
                          ? "Taken down, under review"
                          : l.status === "expired"
                            ? "Expired. Relisting is not built yet."
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
                soldListings.map((l) => (
                  <ListingRow
                    key={l.id}
                    listing={l}
                    showChip={false}
                    // The way back, for a sale that fell through or a tap she
                    // did not mean. It goes straight back to live rather than
                    // to the queue: we approved this listing once already.
                    action={
                      <TextLink
                        className="listing-row-action-link"
                        disabled={sellingId === l.id}
                        onClick={() => move(l.id, "live")}
                      >
                        {sellingId === l.id ? (
                          <>
                            <span className="btn-spinner btn-spinner-inline" aria-hidden="true" />
                            Putting it back...
                          </>
                        ) : (
                          <>
                            Mark as unsold <RepeatIcon />
                          </>
                        )}
                      </TextLink>
                    }
                  />
                ))
              ) : (
                <div className="empty-state">
                  <p className="empty-state-heading">Nothing sold yet</p>
                </div>
              ))}

            {tab === "drafts" &&
              (draft ? (
                <DraftRow loaded={draft} coverUrl={draftCover} />
              ) : (
                <div className="empty-state">
                  <p className="empty-state-heading">No drafts</p>
                  <p className="empty-state-body">
                    A listing you start and don&apos;t post is kept here, on this phone, for a week.
                  </p>
                </div>
              ))}
          </>
        ) : publicListings.length > 0 ? (
          <div className="browse-grid seller-profile-grid" style={{ marginTop: "var(--space-5)" }}>
            {publicListings.map((l) => (
              <BrowseCard
                key={l.id}
                id={l.id}
                title={l.title}
                brand={l.brand}
                brandOther={l.brandOther}
                category={l.category}
                askingPrice={l.askingPrice}
                coverPhoto={l.coverPhoto}
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
