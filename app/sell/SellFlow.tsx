"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import BottomSheet from "@/components/ui/BottomSheet";
import PhotoGrid from "@/components/seller/PhotoGrid";
import PhotoGuide from "@/components/seller/PhotoGuide";
import PhotoSource from "@/components/seller/PhotoSource";
import { preparePhotos } from "@/lib/photos";
import { MIN_LISTING_PHOTOS, MAX_LISTING_PHOTOS } from "@/lib/constants";
import ReadingPhotos from "./ReadingPhotos";
import SellForm from "./SellForm";
import AccountFlow from "./AccountFlow";
import Nav from "@/components/ui/Nav";
import { requestPhotoQuality, requestPrefill } from "./aiRequests";
import type { QualityFlag } from "./aiRequests";
import { EMPTY_PREFILL, prefillToForm, type Prefilled } from "./prefillToForm";
import { flagFor, flaggedCount, qualityHeading, slotNote } from "./qualityWording";
import { EMPTY_FIELDS, mergePrefill, type FormFields, type SellPhoto } from "./types";
import { EMPTY_ACCOUNT, type AccountFields } from "./account";
import { submitListing } from "./submitListing";
import { DEV_FIELDS, DEV_PREFILLED, devPhotoFiles } from "./devFixture";

// Path 1, the whole seller flow on one page.
//
//   intro     the photo guide, first listing only
//   photos    take or choose photos, pick the cover
//   reading   both Gemini calls, side by side
//   details   the form, already part filled
//   account   name, email and password, then the phone number and its code
//
// It is one component with a `step` rather than four routes because the photos
// only exist as object URLs in this tab. A real navigation would throw them
// away and she would have to shoot the item again.

type Step = "intro" | "photos" | "reading" | "details" | "account";

/** DEVELOPMENT ONLY. Reaching the form normally costs two Gemini calls, so
 *  testing anything after it was burning credits on a photo read nobody needed.
 *  Next strips this branch from the production bundle. */
const DEV_SKIP = process.env.NODE_ENV !== "production";

/** Remembering she has seen the guide is a convenience, not a setting, so
 *  localStorage is enough. A new phone showing it again is the right outcome. */
const GUIDE_SEEN_KEY = "reloved.sell.guide-seen";

/** When the wait stops being normal and we say so. Matches AI_TIMEOUT_MS in
 *  lib/ai/images.ts, which is where the call itself gives up. Not imported:
 *  that module is server code and has no business in the browser bundle. */
const SLOW_AFTER_MS = 15_000;

/** A local id for a photo in this form, nothing to do with the Listing id.
 *
 *  crypto.randomUUID() exists only in a secure context, so it is there on
 *  localhost and on https but undefined when the phone opens the dev server
 *  over http on the local network. That is exactly how we test on a real
 *  phone, so fall back rather than throw. */
function photoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SellFlow() {
  // null until the effect below has read localStorage. Deciding during render
  // would make the server and the browser draw different first screens, which
  // React treats as a hydration error.
  const [step, setStep] = useState<Step | null>(null);

  const [photos, setPhotos] = useState<SellPhoto[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // The form's values live here, not in SellForm, so that stepping back to the
  // photos and returning does not throw away everything she typed.
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [prefilled, setPrefilled] = useState<Prefilled>(EMPTY_PREFILL);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [retakeTip, setRetakeTip] = useState<string | null>(null);
  const [qualitySheetOpen, setQualitySheetOpen] = useState(false);

  // The account answers live up here for the same reason the form's do: she can
  // step back to her listing and return without retyping any of it.
  const [account, setAccount] = useState<AccountFields>(EMPTY_ACCOUNT);
  // Set once the listing is actually in Firestore. Owned here rather than in
  // SellForm because that form unmounts when she moves on to the account step.
  const [submitted, setSubmitted] = useState<AccountFields | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when she taps the wordmark or the menu with work in progress. Holds
  // the sheet open until she decides.
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Every object URL we have handed out, so none leak when the tab closes.
  const urlsRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(GUIDE_SEEN_KEY) === "1";
    } catch {
      // Private browsing can throw on localStorage. Showing the guide one more
      // time is a far smaller problem than the page not rendering.
    }
    setStep(seen ? "photos" : "intro");
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      abortRef.current?.abort();
    };
  }, []);

  function markGuideSeen() {
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      // See above. Nothing depends on this succeeding.
    }
  }

  const handleAdd = useCallback(async (files: File[]) => {
    setPreparing(true);
    setPhotoError(null);
    // Converts HEIC, resizes to 1600px and strips EXIF, so her home GPS
    // location never leaves the phone. It never throws: on failure it keeps the
    // original and sets `problem`.
    const prepared = await preparePhotos(files);
    const added: SellPhoto[] = prepared.map((item) => {
      const url = URL.createObjectURL(item.file);
      urlsRef.current.push(url);
      return { id: photoId(), url, problem: item.problem, file: item.file };
    });
    setPhotos((current) => {
      const next = [...current, ...added].slice(0, MAX_LISTING_PHOTOS);
      // The first photo added becomes the cover. She can change it after.
      setCoverId((currentCover) => currentCover ?? next[0]?.id ?? null);
      return next;
    });
    setPreparing(false);
  }, []);

  function handleRemove(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      const next = current.filter((item) => item.id !== id);
      setCoverId((currentCover) => (currentCover === id ? (next[0]?.id ?? null) : currentCover));
      return next;
    });
  }

  /** Choosing the cover also moves that photo to the front, so the order on
   *  screen is the order a buyer will scroll through. The note from the photo
   *  check travels with the photo, so nothing desyncs. */
  function handleSetCover(id: string) {
    setPhotos((current) => {
      const chosen = current.find((photo) => photo.id === id);
      if (!chosen) return current;
      return [chosen, ...current.filter((photo) => photo.id !== id)];
    });
    setCoverId(id);
  }

  function applyQuality(flags: QualityFlag[]) {
    setPhotos((current) =>
      current.map((photo, index) => ({ ...photo, note: slotNote(flagFor(flags, index)) })),
    );
  }

  /** Fires both calls at once, so she waits for the slower one rather than the
   *  sum of the two. Neither one can block her: whatever comes back, or does
   *  not, the next screen is the form. */
  function startReading() {
    if (photos.length < MIN_LISTING_PHOTOS) {
      setPhotoError(
        `Add ${MIN_LISTING_PHOTOS - photos.length} more photo${
          MIN_LISTING_PHOTOS - photos.length === 1 ? "" : "s"
        }. Buyers skip listings with just one.`,
      );
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const files = photos.map((photo) => photo.file);

    setSlow(false);
    setPrefillError(null);
    // Clear the last read before starting a new one. Without this, a second
    // attempt that fails would leave the previous attempt's suggestions on
    // screen, still marked "AI suggested", under a notice saying we could not
    // read the photos.
    setPrefilled(EMPTY_PREFILL);
    setStep("reading");

    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);

    const prefill = requestPrefill(files, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        const next = prefillToForm(result.listing);
        setPrefilled(next);
        // Fills empty fields only. Anything she has already typed wins.
        setFields((current) => mergePrefill(current, next));
      } else {
        setPrefillError(result.error);
      }
    });

    const quality = requestPhotoQuality(files, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      applyQuality(result.flags);
      if (!result.skipped && result.retakeTip && flaggedCount(result.flags) > 0) {
        setRetakeTip(result.retakeTip);
      }
    });

    void Promise.all([prefill, quality]).then(() => {
      window.clearTimeout(slowTimer);
      if (controller.signal.aborted) return;
      setStep("details");
      setQualitySheetOpen(true);
    });
  }

  function skipReading() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("details");
  }

  /** Creates her account, uploads the photos and writes the listing as
   *  "pending". The last thing the seller flow does.
   *
   *  Everything happens here rather than inside AccountFlow because the photos
   *  and the form live at this level. It is also the only place that knows
   *  whether all three steps succeeded, which is what the success sheet is
   *  claiming when it says the listing is under review. */
  async function finishSubmit(finished: AccountFields) {
    setAccount(finished);
    setSubmitting(true);
    setSubmitError(null);

    const result = await submitListing(finished, fields, photos, coverId);

    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(finished);
  }

  /** DEVELOPMENT ONLY. Straight to the form with a listing already filled in,
   *  so the account step can be walked through without paying for a photo
   *  read. Photos are optional here: with none added the form simply shows an
   *  empty thumbnail strip. */
  async function devSkipToForm() {
    abortRef.current?.abort();
    abortRef.current = null;
    setPrefillError(null);
    setPrefilled(DEV_PREFILLED);
    setFields(DEV_FIELDS);
    // A listing needs MIN_LISTING_PHOTOS and the server enforces it, so
    // without these the dev route could fill the form but never submit. Goes
    // through handleAdd like any other photo, so the real prepare-and-upload
    // path is what gets tested.
    if (photos.length === 0) await handleAdd(await devPhotoFiles());
    setStep("details");
  }

  /** Everything she would lose by leaving. Photos are the expensive part: she
   *  has the item in her hands and may not have it there again. Typed fields
   *  count too, because the form is long.
   *
   *  Once the listing is saved there is nothing to warn about, which is why
   *  `submitted` ends it. */
  const hasUnsavedWork =
    submitted === null &&
    (photos.length > 0 ||
      Boolean(fields.title.trim() || fields.description.trim() || fields.price) ||
      Boolean(account.fullName.trim() || account.email.trim()));

  /** Nav calls this before the wordmark or the menu takes her away. Returning
   *  false cancels the navigation and shows the sheet instead. */
  function confirmLeave(): boolean {
    if (!hasUnsavedWork) return true;
    setLeaveOpen(true);
    return false;
  }

  /** The nav on every step, including the photo guide. The Sell link is
   *  hidden: she is already here, having tapped it. */
  function withNav(body: React.ReactNode) {
    return (
      <>
        <Nav hideSell onBeforeLeave={confirmLeave} />
        {body}

        {/* No design in components.html for this one. Same two-choice shape as
            the photo quality sheet: the safe option is the button, leaving is
            the quieter link. */}
        <BottomSheet
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          heading="Leave without posting?"
          body={
            photos.length > 0
              ? "Your photos and anything you have filled in will be lost. Nothing is saved until you post your listing."
              : "Anything you have filled in will be lost. Nothing is saved until you post your listing."
          }
        >
          <PrimaryButton onClick={() => setLeaveOpen(false)}>Keep going</PrimaryButton>
          <TextLink
            onClick={() => {
              setLeaveOpen(false);
              window.location.href = "/";
            }}
          >
            Leave and lose it
          </TextLink>
        </BottomSheet>
      </>
    );
  }

  if (step === null) {
    // One tick, while localStorage is read. Deliberately blank rather than a
    // skeleton: anything drawn here would be replaced before it was seen.
    return <div className="sell-step" aria-busy="true" />;
  }

  const room = MAX_LISTING_PHOTOS - photos.length;
  const flagged = photos.filter((photo) => photo.note).length;

  if (step === "intro") {
    return withNav(
      <div className="sell-step">
        <h1 className="text-h1 sell-heading">Photo tips.</h1>

        <PhotoGuide />

        <div className="sell-footer">
          <PhotoSource
            room={room}
            onPick={(files) => {
              markGuideSeen();
              setStep("photos");
              void handleAdd(files);
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "photos") {
    return withNav(
      <>
        <div className="sell-step">
          <div className="sell-step-head">
            <h1 className="text-h1 sell-heading">Your photos.</h1>
            <TextLink onClick={() => setGuideOpen(true)}>View photo guide</TextLink>
          </div>

          <PhotoGrid
            photos={photos}
            coverId={coverId}
            onAdd={(files) => void handleAdd(files)}
            onRemove={handleRemove}
            onSetCover={handleSetCover}
          />

          {/* Says why the button below is dim, right where she is looking. */}
          {photos.length < MIN_LISTING_PHOTOS && (
            <p className="photo-grid-note">
              Add at least {MIN_LISTING_PHOTOS} pictures to develop a buyer&apos;s interest
            </p>
          )}

          {preparing && <p className="input-hint">Getting your photos ready...</p>}
          {photoError && <p className="input-error-msg">{photoError}</p>}

          {/* CHANGED, deliberately: this button is disabled below two photos.
              design-system.md says never disable the next button, so this is a
              reversal we agreed on screen, not an oversight. The counter and
              the line above it carry the reason. */}
          <div className="sell-footer">
            <PrimaryButton
              onClick={startReading}
              disabled={preparing || photos.length < MIN_LISTING_PHOTOS}
            >
              {`Build my listing (${photos.length}/${MAX_LISTING_PHOTOS})`}
            </PrimaryButton>

            {/* DEVELOPMENT ONLY, and deliberately ugly so it is never mistaken
                for part of the design. Skips both Gemini calls and lands on a
                filled-in form, which is the only cheap way to reach the
                account step. Not in the production bundle. */}
            {DEV_SKIP && (
              <button type="button" className="dev-skip" onClick={() => void devSkipToForm()}>
                Dev: skip the AI, fill the form
              </button>
            )}
          </div>
        </div>

        <BottomSheet
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          heading="How to photograph it"
          body="Five things that make the difference between a listing that sells and one that gets skipped."
        >
          <PhotoGuide />
          <PrimaryButton onClick={() => setGuideOpen(false)}>Got it</PrimaryButton>
        </BottomSheet>
      </>
    );
  }

  if (step === "reading") {
    return withNav(<ReadingPhotos photos={photos} slow={slow} onSkip={skipReading} />);
  }

  const cover = photos.find((photo) => photo.id === coverId);
  const priceLabel = fields.price
    ? `Rs ${Number(fields.price).toLocaleString("en-PK")}`
    : "No price yet";

  /* The account step. Reached from Submit listing on the form and nowhere
     else, so her listing is complete by the time she gets here. */
  if (step === "account") {
    return withNav(
      <>
        <AccountFlow
          listing={{
            title: fields.title,
            price: fields.price,
            coverUrl: cover?.url,
            summary: priceLabel,
          }}
          fields={account}
          onChange={(patch) => setAccount((current) => ({ ...current, ...patch }))}
          onBack={() => setStep("details")}
          busy={submitting}
          submitError={submitError}
          onDone={(finished) => void finishSubmit(finished)}
        />

        <BottomSheet
          open={submitted !== null}
          onClose={() => setSubmitted(null)}
          heading="All good so far!"
          // The number is always collected now, so there is no second version
          // of this. We check it is on WhatsApp as part of the review, which
          // is why the copy promises a day rather than minutes.
          body="We'll review your listing and check your number is on WhatsApp. You'll hear from us within a day."
          media={
            <div className="bottom-sheet-item">
              {cover ? (
                <img className="bottom-sheet-thumb" src={cover.url} alt="" />
              ) : (
                <div className="bottom-sheet-thumb" />
              )}
              <div>
                <p className="bottom-sheet-item-name">{fields.title}</p>
                <p className="bottom-sheet-item-price">{priceLabel}</p>
              </div>
            </div>
          }
        >
          <PrimaryButton onClick={() => setSubmitted(null)}>View my listings</PrimaryButton>
          <TextLink onClick={() => setSubmitted(null)}>List another item</TextLink>
        </BottomSheet>
      </>
    );
  }

  return withNav(
    <>
      <div className="sell-step">
        <h1 className="text-h1 sell-heading">Have a last look.</h1>
        <p className="sell-sub">
          Some details were filled in by AI based on your photos. Give them a quick check and make
          any edits!
        </p>
        <SellForm
          photos={photos}
          coverId={coverId}
          fields={fields}
          onChange={(patch) => setFields((current) => ({ ...current, ...patch }))}
          prefilled={prefilled}
          prefillError={prefillError}
          onBackToPhotos={() => setStep("photos")}
          // Submit no longer finishes the flow: it hands her to the account
          // step, which is the last thing between her and a pending listing.
          onSubmit={() => setStep("account")}
        />
      </div>

      {/* Advisory only. Both ways out are real, and "Keep them" changes nothing. */}
      <BottomSheet
        open={qualitySheetOpen && Boolean(retakeTip) && flagged > 0}
        onClose={() => setQualitySheetOpen(false)}
        heading={qualityHeading(flagged)}
        body={retakeTip ?? ""}
        dismissOnOverlayClick={false}
        media={
          <div className="quality-thumbs">
            {photos
              .filter((photo) => photo.note)
              .map((photo) => (
                <span key={photo.id} className="quality-thumb">
                  <img src={photo.url} alt="" />
                  <span className="photo-slot-problem">{photo.note}</span>
                </span>
              ))}
          </div>
        }
      >
        <PrimaryButton
          onClick={() => {
            setQualitySheetOpen(false);
            setStep("photos");
          }}
        >
          {flagged === 1 ? "Retake it" : "Retake them"}
        </PrimaryButton>
        <TextLink onClick={() => setQualitySheetOpen(false)}>
          {flagged === 1 ? "Keep it and carry on" : "Keep them and carry on"}
        </TextLink>
      </BottomSheet>
    </>
  );
}
