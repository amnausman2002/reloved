"use client";

// The listing edit flow. One scrollable page, three modes driven by status:
//
//   live       The slim form (LiveEditForm): photos appendable, price lowerable,
//              description editable. Everything else shown as a plain summary
//              with "Contact us to change this." Saving keeps the listing live.
//   rejected   The full SellForm with EMPTY_PREFILL (no AI sparkles). A banner
//              above the form shows the rejection reason. Saving sets the
//              status back to pending so we review it.
//   pending    No form at all: a plain read-only summary with "You can edit
//              this once we've reviewed it." She shouldn't need to come here.
//
// Not reached: sold, expired, hidden. These show "This listing can't be edited."
//
// A deliberate departure from SellFlow: this is one scrollable page, not a
// four-step wizard. The photos already exist on the server, so there is no
// "take them, then build your listing" sequence to walk through. Vinted and
// Depop both edit on one page for the same reason.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Nav from "@/components/ui/Nav";
import BottomSheet from "@/components/ui/BottomSheet";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import { preparePhotos } from "@/lib/photos";
import { isRemotePhoto } from "@/lib/photoUrl";
import { useAuthUser } from "@/lib/useAuthUser";
import { fetchListing, type ListingDetail } from "@/lib/fetchListing";
import {
  updateMyListing,
  uploadMyListingPhoto,
  type UpdateLivePatch,
  type UpdateRejectedPatch,
} from "@/lib/myListings";
import {
  BRANDS,
  CATEGORIES,
  CITIES,
  CONDITIONS,
  MATERIALS,
  MAX_LISTING_PHOTOS,
  REJECTION_REASON_LABELS,
  brandLabel,
  categoryLabel,
} from "@/lib/constants";
import { listingToFields } from "./listingToFields";
import { EMPTY_FIELDS, type FormFields, type SellPhoto } from "./types";
import { EMPTY_PREFILL } from "./prefillToForm";
import { validateFields } from "./validate";
import { localId } from "./ids";
import SellForm from "./SellForm";
import LiveEditForm from "./LiveEditForm";

type Props = { listingId: string };

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "not-mine" }
  | { status: "frozen"; listing: ListingDetail }
  | { status: "ready"; listing: ListingDetail };

function BackIcon() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path
        d="M23 7H1M1 7l5.5-6M1 7l5.5 6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The small summary rendered for pending listings — one plain field label
 *  with its value underneath. Not a disabled input, deliberately: nothing on
 *  this screen is a control. */
function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-field">
      <span className="sell-form-section-label">{label}</span>
      <p className="summary-field-value">{value || "—"}</p>
    </div>
  );
}

function cityLabel(value: string): string {
  return CITIES.find((c) => c.value === value)?.label ?? value;
}

function conditionLabel(value: string | null): string {
  if (!value) return "";
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

function materialLabel(value: string): string {
  if (!value) return "";
  return MATERIALS.find((m) => m.value === value)?.label ?? value;
}

function brandDisplay(brand: string, brandOther: string): string {
  if (brand === "other" && brandOther) return brandOther;
  // The brand list is strict-typed on BRANDS; brandLabel takes a Brand.
  if ((BRANDS as readonly string[]).includes(brand)) {
    return brandLabel(brand as (typeof BRANDS)[number]);
  }
  return brand;
}

export default function EditFlow({ listingId }: Props) {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuthUser();

  const [state, setState] = useState<LoadState>({ status: "loading" });

  // The editable copy of the listing's fields. Owned here, like SellFlow owns
  // the create form's values, so a navigation inside the form (e.g. a photo
  // reorder in rejected mode) does not wipe what she typed.
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  // The photo list she is editing. Each existing server photo gets a local id
  // so the grid can address it; new photos she adds carry their own File.
  const [photos, setPhotos] = useState<SellPhoto[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [frozenIds, setFrozenIds] = useState<ReadonlySet<string>>(new Set());

  // Submit state. Set here rather than inside LiveEditForm / SellForm because
  // the submit itself happens here.
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState<null | "live" | "rejected">(null);

  // Object URLs we have handed out for photos she added in this session, so
  // none leak when the tab closes.
  const urlsRef = useRef<string[]>([]);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let live = true;
    void fetchListing(listingId).then((result) => {
      if (!live) return;
      if (result.status === "missing") {
        setState({ status: "missing" });
        return;
      }
      if (result.status === "error") {
        setState({ status: "missing" });
        return;
      }

      const listing = result.listing;
      // The item route already enforces "live, or your own, or admin". So if
      // she can see it here, either it is live (anyone can) or it is hers.
      // The anyone-can case still needs a seller check: a browser visiting
      // /sell/{live listing id}/edit for someone else's listing must bounce.
      const isOwner = Boolean(authUser && authUser.uid === listing.seller.id);
      if (!isOwner) {
        setState({ status: "not-mine" });
        return;
      }

      // sold / expired / hidden: she sees her listing, but there is no edit.
      if (
        listing.status === "sold" ||
        listing.status === "expired" ||
        listing.status === "hidden"
      ) {
        setState({ status: "frozen", listing });
        return;
      }

      // live, rejected, pending: all three show something. The sub-renders
      // decide what.
      const initialFields = listingToFields(listing);
      setFields(initialFields);

      const existing: SellPhoto[] = listing.photos.map((photo) => ({
        id: localId(),
        url: photo.url,
        // A server photo has no File; we only need it for appended photos
        // being uploaded on save. Placeholder empty blob so the type lines up.
        file: new File([], "existing"),
      }));
      setPhotos(existing);
      setFrozenIds(new Set(existing.map((p) => p.id)));

      const cover = listing.photos.findIndex((p) => p.isCover);
      setCoverId(existing[cover]?.id ?? existing[0]?.id ?? null);

      setState({ status: "ready", listing });
    });

    return () => {
      live = false;
    };
  }, [authLoading, authUser, listingId]);

  const handleAddPhotos = useCallback(async (files: File[]) => {
    setPreparing(true);
    const prepared = await preparePhotos(files);
    const added: SellPhoto[] = prepared.map((item) => {
      const url = URL.createObjectURL(item.file);
      urlsRef.current.push(url);
      return { id: localId(), url, problem: item.problem, file: item.file };
    });
    setPhotos((current) => [...current, ...added].slice(0, MAX_LISTING_PHOTOS));
    setPreparing(false);
  }, []);

  function handleRemovePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      // Only object URLs we created need revoking. Server URLs are shared.
      if (photo && !frozenIds.has(id)) URL.revokeObjectURL(photo.url);
      const next = current.filter((item) => item.id !== id);
      setCoverId((currentCover) => (currentCover === id ? (next[0]?.id ?? null) : currentCover));
      return next;
    });
  }

  function handleSetCover(id: string) {
    // Rejected mode: she can rearrange the full list. The cover moves to the
    // front, same rule as the create flow.
    setPhotos((current) => {
      const chosen = current.find((photo) => photo.id === id);
      if (!chosen) return current;
      return [chosen, ...current.filter((photo) => photo.id !== id)];
    });
    setCoverId(id);
  }

  async function saveLive(listing: ListingDetail) {
    setSubmitting(true);
    setSubmitError(null);

    // Only photos she added in this edit are new to the server. The old ones
    // are left in place by the server, so we send only the new URLs.
    const newPhotos = photos.filter((photo) => !frozenIds.has(photo.id));
    const uploadedUrls: string[] = [];
    for (const photo of newPhotos) {
      const url = await uploadMyListingPhoto(photo.file);
      if (!url) {
        setSubmitting(false);
        setSubmitError("Your photos did not finish uploading. Check your connection and try again.");
        return;
      }
      uploadedUrls.push(url);
    }

    const patch: UpdateLivePatch = {
      kind: "live",
      description: fields.description,
      price: fields.price,
      appendedPhotos: uploadedUrls.map((url) => ({ url })),
    };

    const result = await updateMyListing(listing.id, patch);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSuccessOpen("live");
  }

  async function saveRejected(listing: ListingDetail) {
    setSubmitting(true);
    setSubmitError(null);

    // Full validation, same rules as the create submit, so a card that the
    // review screen calls complete also passes here.
    const found = validateFields(fields);
    if (Object.keys(found).length > 0) {
      setSubmitting(false);
      setSubmitError("Some details still need your attention. Scroll up to fix them.");
      return;
    }

    // Upload any photos she added. Existing ones already have server URLs and
    // keep them, so the server can tell new from old.
    const resolvedUrls: Array<string | null> = await Promise.all(
      photos.map(async (photo) => {
        if (frozenIds.has(photo.id)) return photo.url;
        return uploadMyListingPhoto(photo.file);
      }),
    );
    if (resolvedUrls.some((url) => url === null)) {
      setSubmitting(false);
      setSubmitError("Your photos did not finish uploading. Check your connection and try again.");
      return;
    }

    const nextPhotos = photos.map((photo, index) => ({
      url: resolvedUrls[index]!,
      position: index,
      is_cover: photo.id === coverId,
      quality_flags: null,
    }));

    const patch: UpdateRejectedPatch = {
      kind: "rejected",
      title: fields.title.trim(),
      description: fields.description.trim(),
      brand: fields.brand,
      brandOther: fields.brandOther.trim(),
      category: fields.category,
      size: fields.size,
      condition: fields.condition!,
      isReplica: fields.isReplica!,
      price: fields.price,
      city: fields.city,
      material: fields.material,
      photos: nextPhotos,
    };

    const result = await updateMyListing(listing.id, patch);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSuccessOpen("rejected");
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  if (authLoading || state.status === "loading") {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }} aria-busy="true" />
      </>
    );
  }

  if (state.status === "missing") {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }}>
          <p className="text-body">Listing not found.</p>
        </main>
      </>
    );
  }

  if (state.status === "not-mine") {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }}>
          <p className="text-body">You can only edit your own listings.</p>
        </main>
      </>
    );
  }

  if (state.status === "frozen") {
    const listing = state.listing;
    const label =
      listing.status === "sold"
        ? "This listing has been marked sold and can't be edited."
        : listing.status === "expired"
          ? "This listing has expired and can't be edited."
          : "This listing is hidden and can't be edited.";
    return (
      <>
        <Nav />
        <main className="container sell-page">
          <div className="sell-step">
            <EditHeader sellerId={listing.seller.id} />
            <p className="sell-sub">{label}</p>
          </div>
        </main>
      </>
    );
  }

  const listing = state.listing;
  const cover = photos.find((photo) => photo.id === coverId);
  const priceLabel = fields.price
    ? `Rs ${Number(fields.price).toLocaleString("en-PK")}`
    : "No price yet";

  // Success sheet. Shown after a save, in either mode. For a rejected
  // resubmit, it also sends her to her In review tab via the ?tab= hint.
  const successSheet = (
    <BottomSheet
      open={successOpen !== null}
      onClose={() => setSuccessOpen(null)}
      heading={successOpen === "rejected" ? "Resubmitted!" : "Saved."}
      body={
        successOpen === "rejected"
          ? "We'll take another look and get back to you within a day."
          : "Your changes are live."
      }
      media={
        <div className="bottom-sheet-item">
          {cover ? (
            isRemotePhoto(cover.url) ? (
              <img className="bottom-sheet-thumb" src={cover.url} alt="" />
            ) : (
              <Image
                className="bottom-sheet-thumb"
                src={cover.url}
                alt=""
                width={56}
                height={56}
                unoptimized
              />
            )
          ) : (
            <div className="bottom-sheet-thumb" />
          )}
          <div>
            <p className="bottom-sheet-item-name">{fields.title || listing.title}</p>
            <p className="bottom-sheet-item-price">{priceLabel}</p>
          </div>
        </div>
      }
    >
      <PrimaryButton
        onClick={() => {
          const tab = successOpen === "rejected" ? "?tab=inReview" : "";
          router.push(`/seller/${listing.seller.id}${tab}`);
        }}
      >
        Back to my listings
      </PrimaryButton>
    </BottomSheet>
  );

  if (listing.status === "pending") {
    const sizeShown = fields.size ?? "";
    const isReplicaShown = fields.isReplica === null ? "" : fields.isReplica ? "Yes" : "No";
    return (
      <>
        <Nav />
        <main className="container sell-page">
          <div className="sell-step">
            <EditHeader sellerId={listing.seller.id} />
            <p className="sell-sub">You can edit this once we&apos;ve reviewed it.</p>

            {/* The listing's own photos as a scrolling thumbnail row, so she
                can see which one she posted at a glance. Reuses the create
                form's own thumbnail strip. */}
            <div className="sell-form-photos" style={{ marginTop: "var(--space-5)" }}>
              {listing.photos.map((photo) => (
                <img key={photo.url} className="sell-form-thumb" src={photo.url} alt="" />
              ))}
            </div>

            <div className="summary-list">
              <SummaryField label="Title" value={fields.title} />
              <SummaryField label="Description" value={fields.description} />
              <SummaryField
                label="What is it?"
                value={fields.category ? categoryLabel(fields.category) : ""}
              />
              <SummaryField label="Brand" value={brandDisplay(fields.brand, fields.brandOther)} />
              {sizeShown && <SummaryField label="Size" value={sizeShown} />}
              <SummaryField label="Condition" value={conditionLabel(fields.condition)} />
              <SummaryField label="Is it a replica?" value={isReplicaShown} />
              <SummaryField label="Price" value={priceLabel} />
              <SummaryField label="City" value={cityLabel(fields.city)} />
              {fields.material && (
                <SummaryField label="Material" value={materialLabel(fields.material)} />
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  if (listing.status === "live") {
    return (
      <>
        <Nav />
        <main className="container sell-page">
          <div className="sell-step">
            <EditHeader sellerId={listing.seller.id} />
            <h1 className="text-h1 sell-heading">Edit listing</h1>

            <LiveEditForm
              photos={photos}
              frozenIds={frozenIds}
              coverId={coverId}
              onAddPhotos={(files) => void handleAddPhotos(files)}
              onRemovePhoto={handleRemovePhoto}
              fields={fields}
              description={fields.description}
              onDescriptionChange={(next) =>
                setFields((current) => ({ ...current, description: next }))
              }
              price={fields.price}
              onPriceChange={(next) =>
                setFields((current) => ({ ...current, price: next }))
              }
              maxPrice={listing.askingPrice}
              submitting={submitting || preparing}
              submitError={submitError}
              onSubmit={() => void saveLive(listing)}
            />
          </div>
          {successSheet}
        </main>
      </>
    );
  }

  // rejected: the full form, with the reason at the top.
  const reasonLabel = listing.rejection_reason
    ? REJECTION_REASON_LABELS[listing.rejection_reason]
    : null;
  return (
    <>
      <Nav />
      <main className="container sell-page">
        <div className="sell-step">
          <EditHeader sellerId={listing.seller.id} />
          <h1 className="text-h1 sell-heading">Edit listing</h1>

          <div className="rejection-banner" role="status">
            <p className="rejection-banner-heading">We couldn&apos;t publish this listing.</p>
            {reasonLabel && (
              <p className="rejection-banner-reason">
                Reason: <strong>{reasonLabel}</strong>
              </p>
            )}
            <p className="rejection-banner-body">
              Fix what you need to, then resubmit. We&apos;ll take another look within a day.
            </p>
          </div>

          <SellForm
            photos={photos}
            coverId={coverId}
            fields={fields}
            onChange={(patch) => setFields((current) => ({ ...current, ...patch }))}
            prefilled={EMPTY_PREFILL}
            prefillError={null}
            onBackToPhotos={() => undefined}
            onSubmit={() => void saveRejected(listing)}
            submitLabel={submitting ? "Resubmitting..." : "Resubmit listing"}
            requireComplete
          />

          {submitError && <p className="input-error-msg" style={{ marginTop: "var(--space-3)" }}>{submitError}</p>}
        </div>
        {successSheet}
      </main>
    </>
  );
}

/** The common title row for every mode: back arrow, then "Edit listing".
 *  Lifted out so the three branches don't repeat it. */
function EditHeader({ sellerId }: { sellerId: string }) {
  return (
    <div className="profile-edit-heading">
      <Link
        href={`/seller/${sellerId}`}
        className="profile-edit-back"
        aria-label="Back to my listings"
      >
        <BackIcon />
      </Link>
      <h2 className="profile-edit-title">Edit listing</h2>
    </div>
  );
}
