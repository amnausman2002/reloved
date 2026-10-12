"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/ui/Nav";
import BrowseCard from "@/components/buyer/BrowseCard";
import type { Brand, Category, ConditionValue, City } from "@/lib/constants";
import { BRAND_LABELS, CONDITIONS, CITIES } from "@/lib/constants";
import { MOCK_LISTINGS, getSellerListings, getSoldCount } from "@/lib/sample-data";

const CATEGORY_LABELS: Record<string, string> = {
  kurta: "Kurta",
  pret: "Pret",
  co_ord_set: "Co-ord set",
  dupatta: "Dupatta",
  dress: "Dress",
  top: "Top",
  bottoms: "Bottoms",
  jeans: "Jeans",
  skirt: "Skirt",
  jacket: "Jacket",
  sportswear: "Sportswear",
  shoes: "Shoes",
  bag: "Bag",
};

const BRAND_SPECIAL: Record<string, string> = {
  hm: "H&M",
  maria_b: "Maria B.",
  pull_and_bear: "Pull & Bear",
  marks_and_spencer: "Marks & Spencer",
  ideas_by_gul_ahmed: "Ideas by Gul Ahmed",
  gul_ahmed: "Gul Ahmed",
  alkaram_studio: "Alkaram Studio",
  nishat_linen: "Nishat Linen",
  sana_safinaz: "Sana Safinaz",
  bonanza_satrangi: "Bonanza Satrangi",
  junaid_jamshed: "Junaid Jamshed",
  cross_stitch: "Cross Stitch",
  asim_jofa: "Asim Jofa",
  agha_noor: "Agha Noor",
  faiza_saqlain: "Faiza Saqlain",
  forever_21: "Forever 21",
  tommy_hilfiger: "Tommy Hilfiger",
  calvin_klein: "Calvin Klein",
};

function brandLabel(brand: Brand, brandOther?: string): string | null {
  if (brand === "unknown") return null;
  if (brand === "other") return brandOther ?? null;
  return BRAND_LABELS[brand] ?? brand.replace(/_/g, " ");
}

function formatBrandName(brand: Brand, brandOther?: string): string | null {
  const label = brandLabel(brand, brandOther);
  if (!label) return null;
  return BRAND_SPECIAL[brand] ?? label.charAt(0).toUpperCase() + label.slice(1);
}

function formatPrice(price: number): string {
  return `Rs ${price.toLocaleString("en")}`;
}

function cityLabel(city: City): string {
  const found = CITIES.find((c) => c.value === city);
  return found?.label ?? city;
}

// Lowercase to match the Fraunces-styled initial on the seller profile page.
function initials(name: string): string {
  return name.trim().charAt(0).toLowerCase() || "?";
}

function conditionInfo(value: ConditionValue) {
  return CONDITIONS.find((c) => c.value === value)!;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path d="M23 7H1M1 7l5.5-6M1 7l5.5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OverflowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 6l-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 5l8-3 8 3v7c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V5z" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForwardArrowIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path d="M1 7h22M23 7l-5.5-6M23 7l-5.5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ItemDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [photoIndex, setPhotoIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);

  const listing = MOCK_LISTINGS.find((l) => l.id === id);

  useEffect(() => {
    if (!overflowOpen) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [overflowOpen]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // user cancelled
    }
    setOverflowOpen(false);
  }, [listing?.title]);

  if (!listing) {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }}>
          <p className="text-body">Listing not found.</p>
        </main>
      </>
    );
  }

  const { seller, photos } = listing;
  const brandDisplay = formatBrandName(listing.brand, listing.brandOther);
  const cond = conditionInfo(listing.condition);
  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in your ${listing.title} on Reloved.`
  );
  const whatsappUrl = `https://wa.me/923001234567?text=${whatsappMessage}`;

  const sellerListings = MOCK_LISTINGS.filter(
    (l) => l.seller.id === seller.id && l.id !== listing.id
  );
  // Computed, never stored, per the PRD.
  const sellerListingCount = getSellerListings(seller.id).length;
  const sellerSoldCount = getSoldCount(seller.id);
  const similarListings = MOCK_LISTINGS.filter(
    (l) => l.category === listing.category && l.id !== listing.id && l.seller.id !== seller.id
  ).slice(0, 8);

  function handleSwipeStart(e: React.TouchEvent) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isDraggingRef.current = false;
    dragOffsetRef.current = 0;
  }
  function handleSwipeMove(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (!isDraggingRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
      isDraggingRef.current = true;
    }
    if (isDraggingRef.current && trackRef.current) {
      dragOffsetRef.current = dx;
      const base = -photoIndex * 100;
      const pct = (dx / trackRef.current.parentElement!.clientWidth) * 100;
      trackRef.current.style.transition = "none";
      trackRef.current.style.transform = `translateX(${base + pct}%)`;
    }
  }
  function handleSwipeEnd() {
    if (!touchStartRef.current) return;
    const dx = dragOffsetRef.current;
    touchStartRef.current = null;
    if (trackRef.current) {
      trackRef.current.style.transition = "";
    }
    if (isDraggingRef.current && Math.abs(dx) > 40) {
      if (dx < 0 && photoIndex < photos.length - 1) {
        setPhotoIndex(photoIndex + 1);
      } else if (dx > 0 && photoIndex > 0) {
        setPhotoIndex(photoIndex - 1);
      }
    }
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${-photoIndex * 100}%)`;
    }
    isDraggingRef.current = false;
    dragOffsetRef.current = 0;
  }

  function handleImageTap() {
    if (!isDraggingRef.current) {
      setLightboxOpen(true);
    }
  }

  function lightboxPrev() {
    setPhotoIndex((i) => Math.max(0, i - 1));
  }
  function lightboxNext() {
    setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
  }

  return (
    <>
      <Nav />
      <main className="listing-detail-page">

        {/* Photo carousel with overlaid back + overflow */}
        <div
          className="listing-carousel"
          onTouchStart={handleSwipeStart}
          onTouchMove={handleSwipeMove}
          onTouchEnd={handleSwipeEnd}
        >
          <div
            ref={trackRef}
            className="listing-carousel-track"
            style={{ transform: `translateX(${-photoIndex * 100}%)` }}
          >
            {photos.map((photo, i) => (
              <div
                key={i}
                className="listing-carousel-slide"
                onClick={handleImageTap}
              >
                <Image
                  src={photo.url}
                  alt={`${listing.title}, photo ${i + 1} of ${photos.length}`}
                  fill
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                  priority={i === 0}
                />
              </div>
            ))}
          </div>

          <div className="listing-header">
            <Link href="/browse" className="listing-back" aria-label="Back">
              <BackArrowIcon />
            </Link>
            <div className="listing-overflow-wrap" ref={overflowRef}>
              <button
                type="button"
                className="listing-overflow-btn"
                onClick={() => setOverflowOpen((v) => !v)}
                aria-label="More options"
                aria-expanded={overflowOpen}
              >
                <OverflowIcon />
              </button>
              {overflowOpen && (
                <div className="overflow-menu" role="menu">
                  <button type="button" className="overflow-menu-item" role="menuitem" onClick={handleShare}>
                    <ShareIcon />
                    Share listing
                  </button>
                  <button type="button" className="overflow-menu-item" role="menuitem" onClick={() => setOverflowOpen(false)}>
                    <ReportIcon />
                    Report listing
                  </button>
                </div>
              )}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="listing-photo-bars" aria-hidden="true">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`listing-photo-bar${i === photoIndex ? " active" : ""}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── White hero: brand, title, price ── */}
        <div className="listing-hero">
          {brandDisplay && (
            <span className="listing-brand">{brandDisplay}</span>
          )}
          <h1 className="listing-title">{listing.title}</h1>

          <div className="listing-price-block">
            <span className="listing-price">
              {formatPrice(listing.askingPrice)}
            </span>
          </div>

          <span className="listing-listed-at">
            Listed {timeAgo(listing.createdAt)}
          </span>
        </div>

        {/* ── Surface area: details, description, seller ── */}
        <div className="listing-details-area">

          {/* Key-value details table */}
          <div className="listing-details-table">
            {listing.size && (
              <div className="listing-detail-row">
                <span className="listing-detail-label">Size</span>
                <span className="listing-detail-value">{listing.size}</span>
              </div>
            )}
            <div className="listing-detail-row">
              <span className="listing-detail-label">Category</span>
              <span className="listing-detail-value">
                {CATEGORY_LABELS[listing.category] ?? listing.category}
              </span>
            </div>
            <div className="listing-detail-row">
              <span className="listing-detail-label">Condition</span>
              <span className="listing-detail-value">{cond.label}</span>
            </div>
            <div className="listing-detail-row">
              <span className="listing-detail-label">City</span>
              <span className="listing-detail-value">{cityLabel(listing.city)}</span>
            </div>
          </div>

          {/* Description + notes (notes revealed by "See more") */}
          {listing.description && (
            <div className="listing-description-block">
              <span className="listing-description-label">Description</span>
              <p className={`listing-description-text${!descExpanded ? " clamped" : ""}`}>
                {listing.description}
              </p>
              {!descExpanded && (
                <button
                  type="button"
                  className="desc-see-more"
                  onClick={() => setDescExpanded(true)}
                >
                  See more
                </button>
              )}
              {descExpanded && (
                <>
                  <div className="listing-notes">
                    <p className="listing-condition-desc">{cond.description}</p>
                    {listing.flawNote && (
                      <div className="listing-note-row">
                        <InfoIcon />
                        <span className="listing-note-text">{listing.flawNote}</span>
                      </div>
                    )}
                    {listing.isReplica && (
                      <span className="replica-badge">Seller marked as replica</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="desc-see-more"
                    onClick={() => setDescExpanded(false)}
                  >
                    See less
                  </button>
                </>
              )}
            </div>
          )}

          {/* Seller card — single row, all info inline */}
          <div className="seller-section">
            <span className="seller-section-label">Seller</span>
            <Link href={`/seller/${seller.id}`} className="seller-box">
              <span className="seller-box-avatar" aria-hidden="true">{initials(seller.displayName)}</span>
              <span className="seller-name">{seller.displayName}</span>
              <span className="seller-box-sep" aria-hidden="true" />
              <span className="seller-box-detail">{cityLabel(seller.city)}</span>
              <span className="seller-box-sep" aria-hidden="true" />
              <span className="seller-box-detail">{sellerListingCount} listings</span>
              <span className="seller-box-sep" aria-hidden="true" />
              <span className="seller-box-detail">{sellerSoldCount} sold</span>
            </Link>
          </div>
        </div>

        {/* ── More from this seller ── */}
        {sellerListings.length > 0 && (
          <section className="reco-section">
            <div className="reco-header">
              <h2 className="reco-heading">More from {seller.displayName}</h2>
              <Link href={`/seller/${seller.id}`} className="reco-see-all">
                See all <ForwardArrowIcon />
              </Link>
            </div>
            <div className="reco-scroll">
              {sellerListings.map((l) => (
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
          </section>
        )}

        {/* ── You may also like ── */}
        {similarListings.length > 0 && (
          <section className="reco-section">
            <div className="reco-header">
              <h2 className="reco-heading">You may also like</h2>
              <Link href={`/browse?category=${listing.category}`} className="reco-see-all">
                See all <ForwardArrowIcon />
              </Link>
            </div>
            <div className="reco-scroll">
              {similarListings.map((l) => (
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
          </section>
        )}

        {/* Sticky WhatsApp CTA */}
        <div className="listing-actions-bar">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            <WhatsAppIcon />
            Message seller on WhatsApp
          </a>
        </div>

      </main>

      {/* ── Fullscreen lightbox ── */}
      {lightboxOpen && (
        <div className="lightbox-overlay">
          <div className="lightbox-header">
            <span className="lightbox-counter">
              {photoIndex + 1}/{photos.length}
            </span>
            <button
              type="button"
              className="lightbox-close"
              aria-label="Close"
              onClick={() => setLightboxOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="lightbox-body">
            <div className="lightbox-image-wrap">
              <Image
                src={photos[photoIndex].url}
                alt={`${listing.title}, photo ${photoIndex + 1} of ${photos.length}`}
                fill
                sizes="100vw"
                style={{ objectFit: "contain" }}
              />
            </div>
            {photoIndex > 0 && (
              <button
                type="button"
                className="lightbox-arrow lightbox-arrow-prev"
                aria-label="Previous photo"
                onClick={lightboxPrev}
              >
                <ChevronLeftIcon />
              </button>
            )}
            {photoIndex < photos.length - 1 && (
              <button
                type="button"
                className="lightbox-arrow lightbox-arrow-next"
                aria-label="Next photo"
                onClick={lightboxNext}
              >
                <ChevronRightIcon />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
