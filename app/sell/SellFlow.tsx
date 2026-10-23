"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import BottomSheet from "@/components/ui/BottomSheet";
import PhotoGrid from "@/components/seller/PhotoGrid";
import PhotoGuide from "@/components/seller/PhotoGuide";
import PhotoSource from "@/components/seller/PhotoSource";
import { preparePhotos } from "@/lib/photos";
import { MIN_LISTING_PHOTOS, MAX_LISTING_PHOTOS, MAX_BATCH_PHOTOS } from "@/lib/constants";
import ReadingPhotos from "./ReadingPhotos";
import SellForm from "./SellForm";
import AccountFlow from "./AccountFlow";
import Nav from "@/components/ui/Nav";
import { requestDuplicate, requestPhotoQuality, requestPrefill } from "./aiRequests";
import type { EarlierListing, QualityFlag } from "./aiRequests";
import { EMPTY_PREFILL, prefillToForm, type Prefilled } from "./prefillToForm";
import { catalogueIndexes, flagFor, flaggedCount, qualityHeading, slotNote } from "./qualityWording";
import { EMPTY_FIELDS, mergePrefill, type FormFields, type SellPhoto } from "./types";
import { EMPTY_ACCOUNT, formatPhone, normalisePhone, type AccountFields } from "./account";
import { submitListing } from "./submitListing";
import { localId } from "./ids";
import BulkFlow from "./bulk/BulkFlow";
import SecondaryButton from "@/components/ui/SecondaryButton";
import type { City } from "@/lib/constants";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { fetchMyProfile } from "@/lib/myListings";
import { knownAccountEmail, rememberAccount } from "@/lib/knownAccount";
import SellLogin from "./SellLogin";
import { deleteDraft, draftsWork, loadDraft, newDraftId, saveDraft, type DraftFiles, type LoadedDraft } from "./draft";

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
//
// CHANGED 21 Oct: the flow is also saved on the phone as she goes (draft.ts),
// so leaving, a reload or the browser being killed no longer loses it. Sell
// always starts fresh, and a draft opens only from the Drafts tab on her
// profile, which links here as /sell?resume=<id>. Never automatically.

type Step = "intro" | "photos" | "reading" | "details" | "account";

/** Remembering she has seen the guide is a convenience, not a setting, so
 *  localStorage is enough. A new phone showing it again is the right outcome. */
const GUIDE_SEEN_KEY = "reloved.sell.guide-seen";

/** When the wait stops being normal and we say so. Matches AI_TIMEOUT_MS in
 *  lib/ai/images.ts, which is where the call itself gives up. Not imported:
 *  that module is server code and has no business in the browser bundle. */
const SLOW_AFTER_MS = 15_000;

export default function SellFlow() {
  // null until the effect below has read localStorage. Deciding during render
  // would make the server and the browser draw different first screens, which
  // React treats as a hydration error.
  const [step, setStep] = useState<Step | null>(null);

  // One item or many. Asked in a sheet every time she arrives, over the
  // single-item screen, so closing the sheet leaves her exactly where Sell
  // has always taken her. "bulk" hands the page to BulkFlow.
  const [mode, setMode] = useState<"ask" | "single" | "bulk">("ask");
  const [bulkHasWork, setBulkHasWork] = useState(false);
  const [profileCity, setProfileCity] = useState<City | null>(null);

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

  // The two checks that each get a sheet of their own, before the photo
  // quality one. Both advisory: every sheet has a way to carry on.
  //   duplicate  she seems to have listed this exact item already
  //   catalogue  a photo looks like a brand's website or studio image
  const [duplicate, setDuplicate] = useState<EarlierListing | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [catalogueIds, setCatalogueIds] = useState<string[]>([]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);

  // The account answers live up here for the same reason the form's do: she can
  // step back to her listing and return without retyping any of it.
  const [account, setAccount] = useState<AccountFields>(EMPTY_ACCOUNT);
  // Set once the listing is actually in Firestore, and never cleared. Owned
  // here rather than in SellForm because that form unmounts when she moves on
  // to the account step.
  //
  // Deliberately separate from successOpen below. These were one piece of
  // state until 13 Oct, which meant closing the success sheet also said the
  // listing had not been posted, and the leave warning came back for work that
  // was already saved. A fact about the listing and the visibility of a sheet
  // are not the same thing.
  const [submitted, setSubmitted] = useState<AccountFields | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when she taps the wordmark or the menu with work in progress. Holds
  // the sheet open until she decides.
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Who she is, if Firebase still has her signed in from a previous listing.
  // undefined means we have not heard back yet; null means nobody.
  const [signedInAs, setSignedInAs] = useState<string | null | undefined>(undefined);

  // Her saved WhatsApp number, if she has given us one before. Its presence is
  // what decides whether Submit asks her to confirm a number in a sheet or
  // takes her to a screen to type one.
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [confirmPhoneOpen, setConfirmPhoneOpen] = useState(false);

  // This visit's draft. A new id every time Sell opens, so a new listing never
  // overwrites one she left; the id of the draft she resumed when she came
  // from the Drafts tab. `draftReady` holds off saving until that is settled.
  const draftIdRef = useRef(newDraftId());
  const resumeIdRef = useRef<string | null | undefined>(undefined);
  const [draftReady, setDraftReady] = useState(false);
  const [draftWorks, setDraftWorks] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<LoadedDraft | null>(null);
  const savedDraftRef = useRef(false);

  // The email this phone last signed in with, if any. Decides whether Submit
  // asks a signed-out seller to log in or to sign up.
  const [knownEmail, setKnownEmail] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");

  const closeModeSheet = useCallback(() => setMode("single"), []);
  const closeDuplicate = useCallback(() => setDuplicateOpen(false), []);
  const closeCatalogue = useCallback(() => setCatalogueOpen(false), []);

  // How many photos are in the grid right now, for handleAdd, which is
  // created once and would otherwise only ever see the first render's count.
  const photoCountRef = useRef(0);
  photoCountRef.current = photos.length;

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
    setKnownEmail(knownAccountEmail());

    let live = true;
    // ?resume=<id> is Continue on the Drafts tab of her profile, and the only
    // way a draft is ever opened.
    // Read once and kept in a ref, because the address is tidied straight
    // after and React's development double mount would otherwise find it gone.
    if (resumeIdRef.current === undefined) {
      resumeIdRef.current = new URLSearchParams(window.location.search).get("resume");
      if (resumeIdRef.current) window.history.replaceState(null, "", "/sell");
    }
    const resumeId = resumeIdRef.current;
    void Promise.all([draftsWork(), resumeId ? loadDraft(resumeId) : Promise.resolve(null)]).then(
      ([works, loaded]) => {
        if (!live) return;
        setDraftWorks(works);
        if (loaded) {
          resumeDraft(loaded);
          // Bulk takes the page over from here; the step only has to be set.
          if (loaded.draft.kind === "bulk") setStep("photos");
        } else {
          setStep(seen ? "photos" : "intro");
        }
        setDraftReady(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  // A seller who listed something earlier in this browser is still signed in,
  // and must never be asked to make a second account. Firebase restores the
  // session asynchronously, so this cannot be read during render.
  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (user) => {
      setSignedInAs(user?.email ?? null);
      if (!user) return;

      // Her name, from the account she already has, because the screen that
      // asks for it is the one she is about to skip. Only into an empty field:
      // if she has typed something, that is hers.
      if (user.displayName) {
        setAccount((current) =>
          current.fullName.trim() ? current : { ...current, fullName: user.displayName ?? "" },
        );
      }

      // And her number, from her profile, so a returning seller is not asked
      // for it on every listing. She still sees the screen, with the number
      // already in the box: it is the one thing on a listing that decides
      // whether a buyer can reach her, and it should never change silently.
      //
      // Stored as E.164, shown as the national part, which is what the field
      // holds and what normalisePhone would make of it anyway.
      void loadProfile();
    });
  }, []);

  /** Her city and saved number, from her profile. Returns the number, so a
   *  seller who has just logged in can be sent to the right next step. */
  async function loadProfile(): Promise<string | null> {
    const profile = await fetchMyProfile();
    // Bulk listing starts every card with her city. The single-item form
    // is left as it was.
    if (profile?.city) setProfileCity(profile.city);
    if (!profile?.phone) return null;
    const phone = profile.phone;
    setSavedPhone(phone);
    setAccount((current) => (current.phone.trim() ? current : { ...current, phone: normalisePhone(phone) }));
    return phone;
  }

  /** She logged in from the sheet. Set straight away rather than waiting for
   *  Firebase's listener, because the next screen depends on it. */
  async function afterSignIn(email: string): Promise<string | null> {
    setSignedInAs(email);
    rememberAccount(email);
    setKnownEmail(email);
    return loadProfile();
  }

  function openLogin(email: string) {
    setLoginEmail(email || knownEmail || "");
    setLoginOpen(true);
  }

  /** Submit on the form. A seller we have a number for confirms it; a
   *  signed-out one this phone knows is asked to log in; anyone else gets
   *  the account screens. */
  function submitFromForm() {
    if (savedPhone) setConfirmPhoneOpen(true);
    else if (signedInAs === null && knownEmail) openLogin(knownEmail);
    else setStep("account");
  }

  async function handleSignedIn(email: string) {
    const phone = await afterSignIn(email);
    setLoginOpen(false);
    if (phone) {
      setStep("details");
      setConfirmPhoneOpen(true);
    } else {
      // The account step opens on the number, because she is signed in now.
      setStep("account");
    }
  }

  // Saves the single-item flow on this phone a moment after each change.
  // Never in bulk (BulkFlow saves its own), and never once the listing is
  // posted.
  useEffect(() => {
    if (!draftReady || mode === "bulk" || submitted !== null || step === null) return;

    const empty =
      photos.length === 0 &&
      !fields.title.trim() &&
      !fields.description.trim() &&
      !fields.price;
    if (empty) {
      // She removed everything. Only clear a draft this visit actually wrote.
      if (savedDraftRef.current) void deleteDraft(draftIdRef.current);
      savedDraftRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const files: Record<string, DraftFiles> = {};
      photos.forEach((photo) => (files[photo.id] = { file: photo.file }));
      savedDraftRef.current = true;
      void saveDraft(
        draftIdRef.current,
        {
          kind: "single",
          step: step === "details" || step === "account" ? "details" : "photos",
          photos: photos.map((photo) => ({ id: photo.id, problem: photo.problem, note: photo.note })),
          coverId,
          fields,
          prefilled,
        },
        files,
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draftReady, mode, submitted, step, photos, coverId, fields, prefilled]);

  /** Opens a draft she chose from the Drafts tab. Saving carries on under the
   *  same id, so the draft is updated rather than copied. */
  function resumeDraft(loaded: LoadedDraft) {
    draftIdRef.current = loaded.id;
    savedDraftRef.current = true;
    if (loaded.draft.kind === "bulk") {
      setBulkDraft(loaded);
      setMode("bulk");
      return;
    }
    const draft = loaded.draft;
    const restored: SellPhoto[] = draft.photos
      .filter((photo) => loaded.files[photo.id])
      .map((photo) => {
        const file = loaded.files[photo.id].file;
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        return { id: photo.id, url, file, problem: photo.problem, note: photo.note };
      });
    setPhotos(restored);
    setCoverId(restored.some((photo) => photo.id === draft.coverId) ? draft.coverId : (restored[0]?.id ?? null));
    setFields(draft.fields);
    setPrefilled(draft.prefilled);
    setMode("single");
    setStep(draft.step === "details" && restored.length >= MIN_LISTING_PHOTOS ? "details" : "photos");
  }

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

  const handleAdd = useCallback(async (picked: File[]) => {
    // Only as many as there is room for. Preparing photos that are about to
    // be thrown away costs memory, and running out of it is one of the ways
    // photos came back blank.
    const room = MAX_LISTING_PHOTOS - photoCountRef.current;
    if (room <= 0) return;
    const files = picked.slice(0, room);
    setPreparing(true);
    setPhotoError(null);
    // Converts HEIC, resizes to 1600px and strips EXIF, so her home GPS
    // location never leaves the phone. It never throws: on failure it keeps the
    // original and sets `problem`.
    const prepared = await preparePhotos(files);
    // A photo the browser cannot draw would be a blank tile. Leave it out and
    // say so instead.
    const unusable = prepared.filter((item) => item.unusable).length;
    const notes: string[] = [];
    if (unusable > 0) {
      notes.push(
        `${unusable} photo${unusable === 1 ? "" : "s"} could not be opened. Save ${
          unusable === 1 ? "it" : "them"
        } as a JPEG and add ${unusable === 1 ? "it" : "them"} again.`,
      );
    }
    if (picked.length > files.length) {
      notes.push(`A listing takes up to ${MAX_LISTING_PHOTOS} photos, so we kept the first ${files.length}.`);
    }
    if (notes.length > 0) setPhotoError(notes.join(" "));
    const added: SellPhoto[] = prepared.filter((item) => !item.unusable).map((item) => {
      const url = URL.createObjectURL(item.file);
      urlsRef.current.push(url);
      return { id: localId(), url, problem: item.problem, file: item.file };
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
    // The photos as they were when the read started, so a flag's index still
    // points at the right photo if she edits them before the answer lands.
    const readPhotos = photos;

    setDuplicate(null);
    setDuplicateOpen(false);
    setCatalogueIds([]);
    setCatalogueOpen(false);

    // Only a signed-in seller has earlier listings to compare against. This
    // one is not waited for: it opens its sheet whenever it answers.
    const user = firebaseAuth().currentUser;
    if (user) {
      void user
        .getIdToken()
        .then((idToken) => requestDuplicate(files, idToken, controller.signal))
        .then((result) => {
          if (controller.signal.aborted || !result.ok || !result.match) return;
          setDuplicate(result.match);
          setDuplicateOpen(true);
        })
        .catch(() => undefined);
    }

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
      setCatalogueIds(
        catalogueIndexes(result.flags)
          .map((index) => readPhotos[index]?.id)
          .filter((id): id is string => Boolean(id)),
      );
      if (!result.skipped && result.retakeTip && flaggedCount(result.flags) > 0) {
        setRetakeTip(result.retakeTip);
      }
    });

    void Promise.all([prefill, quality]).then(() => {
      window.clearTimeout(slowTimer);
      if (controller.signal.aborted) return;
      setStep("details");
      setQualitySheetOpen(true);
      setCatalogueOpen(true);
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
    // Posted, so there is nothing left to pick up. Also keeps a finished
    // listing off a phone that may be shared.
    void deleteDraft(draftIdRef.current);
    // Close the confirm sheet before opening the success one. Two sheets over
    // each other is not a state the design has, or should have.
    setConfirmPhoneOpen(false);
    setSuccessOpen(true);
  }

  /** Her profile, which is where her listings are. A full page load rather than
   *  router.push: this flow is holding six object URLs, an abort controller and
   *  a form, and the profile is going to fetch everything fresh anyway. The
   *  reload is also what frees the photos, instead of leaving them alive in a
   *  tab she has finished with. */
  function goToMyListings() {
    setSuccessOpen(false);
    const uid = firebaseAuth().currentUser?.uid;
    window.location.assign(uid ? `/seller/${uid}` : "/");
  }

  /** Start again, without the posted listing's photos or answers following her
   *  into the next one. Same reload, for the same reason. */
  function listAnother() {
    setSuccessOpen(false);
    window.location.assign("/sell");
  }

  /** Everything she would lose by leaving. Photos are the expensive part: she
   *  has the item in her hands and may not have it there again. Typed fields
   *  count too, because the form is long.
   *
   *  Once the listing is saved there is nothing to warn about, which is why
   *  `submitted` ends it. Nor is there when she is signed in and drafts work:
   *  the listing is under Drafts on her profile, so the warning would be
   *  stopping her for nothing. Signed out, the draft is saved but she has no
   *  profile to find it on yet, so she is still told. */
  const draftReachable = draftWorks && Boolean(signedInAs);
  const hasUnsavedWork =
    (mode === "bulk" && bulkHasWork) ||
    (mode !== "bulk" &&
    !draftReachable &&
    submitted === null &&
    (photos.length > 0 ||
      Boolean(fields.title.trim() || fields.description.trim() || fields.price) ||
      Boolean(account.fullName.trim() || account.email.trim())));

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
        {/* Outside <main>, so the bar sits at the very top of the viewport and
            spans the full width, exactly as it does on every other page. Inside
            it, the page's padding pushed it down and in, and tapping Sell made
            the nav jump. */}
        <Nav hideSell onBeforeLeave={confirmLeave} />
        <main className="container sell-page">{body}</main>

        {/* No design in components.html for this one. Same two-choice shape as
            the photo quality sheet: the safe option is the button, leaving is
            the quieter link. */}
        <BottomSheet
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          heading="Leave without posting?"
          // One wording whether or not she has photos yet. The previous pair
          // split on photos.length, which was a distinction she would never
          // notice and two strings to keep in step.
          body={
            draftWorks
              ? "It's saved as a draft on this phone. To find it again, log in or create an account, then look under Drafts in your profile."
              : "Your progress hasn't been saved yet. If you leave now, you'll lose the photos and details you've added so far."
          }
        >
          <PrimaryButton onClick={() => setLeaveOpen(false)}>Keep going</PrimaryButton>
          <TextLink
            onClick={() => {
              setLeaveOpen(false);
              window.location.href = "/";
            }}
          >
            {draftWorks ? "Leave" : "Leave and lose it"}
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

  if (mode === "bulk") {
    return withNav(
      <BulkFlow
        account={account}
        onAccountChange={(patch) => setAccount((current) => ({ ...current, ...patch }))}
        signedInAs={signedInAs ?? null}
        savedPhone={savedPhone}
        profileCity={profileCity}
        onWorkChange={setBulkHasWork}
        onSingle={() => setMode("single")}
        draft={bulkDraft}
        draftWorks={draftWorks}
        draftReachable={draftReachable}
        knownEmail={knownEmail}
        onSignedIn={afterSignIn}
      />,
    );
  }

  /* NEW: the way into bulk listing. No design in components.html; it is the
     standard sheet with the two stacked actions design-system.md asks for.
     The single-item flow is the primary, because it is what Sell has always
     done. Flagged for Bismah. */
  const modeSheet = (
    <BottomSheet
      open={mode === "ask" && (step === "intro" || step === "photos") && photos.length === 0}
      onClose={closeModeSheet}
      heading="What are you selling?"
      body={`One item, or up to ${MAX_BATCH_PHOTOS} photos of several. We'll sort them into listings for you.`}
    >
      <PrimaryButton onClick={closeModeSheet}>One item</PrimaryButton>
      <SecondaryButton onClick={() => setMode("bulk")}>Many items</SecondaryButton>
    </BottomSheet>
  );

  const loginSheet = (
    <SellLogin
      open={loginOpen}
      onClose={() => setLoginOpen(false)}
      initialEmail={loginEmail}
      returning={Boolean(knownEmail)}
      listingCount={1}
      onSignedIn={handleSignedIn}
      onCreateAccount={() => {
        setLoginOpen(false);
        setStep("account");
      }}
    />
  );

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
        {modeSheet}
      </div>
    );
  }

  if (step === "photos") {
    return withNav(
      <>
        <div className="sell-step">
          <div className="sell-step-head">
            <h1 className="text-h1 sell-heading">Your photos.</h1>
            <TextLink onClick={() => setGuideOpen(true)}>View photo tips</TextLink>
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

          </div>
        </div>

        <BottomSheet
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          heading="Photo tips"
        >
          <PhotoGuide />
          <PrimaryButton onClick={() => setGuideOpen(false)}>Got it</PrimaryButton>
        </BottomSheet>

        {modeSheet}
      </>
    );
  }

  if (step === "reading") {
    return withNav(<ReadingPhotos photos={photos} slow={slow} onSkip={skipReading} />);
  }

  const cover = photos.find((photo) => photo.id === coverId);
  const duplicateSheetOpen = step === "details" && duplicateOpen && duplicate !== null;
  const catalogueSheetOpen =
    step === "details" && !duplicateSheetOpen && catalogueOpen && photos.some((photo) => catalogueIds.includes(photo.id));
  const priceLabel = fields.price
    ? `Rs ${Number(fields.price).toLocaleString("en-PK")}`
    : "No price yet";

  /* Rendered on both of the last two steps, because the listing can now be
     posted from either: from the account screen by a new seller, or from the
     confirm-number sheet over the form by a returning one. It used to live
     inside the account step alone, which meant a listing posted from the form
     was saved and never said so. */
  const successSheet = (
    <BottomSheet
      open={successOpen}
      onClose={() => setSuccessOpen(false)}
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
      {/* Both of these used to only close the sheet, which left her on the
          number screen of a listing she had already posted, looking at a
          button that appeared to do nothing. */}
      <PrimaryButton onClick={goToMyListings}>View my listings</PrimaryButton>
      <TextLink onClick={listAnother}>List another item</TextLink>
    </BottomSheet>
  );

  /* The account step. Reached from Submit listing on the form when we do not
     already know her number, and nowhere else. */
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
          signedInAs={signedInAs ?? null}
          onLogIn={openLogin}
          onDone={(finished) => void finishSubmit(finished)}
        />

        {loginSheet}
        {successSheet}
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
          // Submit hands her to whatever is still missing. For a seller we
          // already have a number for, that is nothing but a quick check that
          // it is still the right one, which is a sheet over the form rather
          // than a screen of its own.
          onSubmit={submitFromForm}
        />
      </div>

      {/* One sheet at a time: duplicate, then catalogue, then photo quality.
          NEW, no design in components.html: the same two-choice sheet as the
          photo quality one. Flagged for Bismah. */}
      <BottomSheet
        open={duplicateSheetOpen}
        onClose={closeDuplicate}
        heading="Have you listed this already?"
        body={
          duplicate
            ? `It looks like the same item as "${duplicate.title}", which is already ${
                duplicate.status === "live" ? "live" : "waiting for review"
              }.`
            : ""
        }
        dismissOnOverlayClick={false}
        media={
          duplicate ? (
            <div className="quality-thumbs">
              {cover && (
                <span className="quality-thumb">
                  <img src={cover.url} alt="" />
                  <span className="photo-slot-problem">This one</span>
                </span>
              )}
              <span className="quality-thumb">
                <img src={duplicate.coverUrl} alt="" />
                <span className="photo-slot-problem">Already listed</span>
              </span>
            </div>
          ) : undefined
        }
      >
        <PrimaryButton
          onClick={() => {
            setDuplicateOpen(false);
            if (duplicate) window.location.assign(`/item/${duplicate.id}`);
          }}
        >
          View that listing
        </PrimaryButton>
        <TextLink onClick={closeDuplicate}>It&apos;s a different item</TextLink>
      </BottomSheet>

      <BottomSheet
        open={catalogueSheetOpen}
        onClose={closeCatalogue}
        heading={
          catalogueIds.length === 1
            ? "This looks like a photo from a brand's website."
            : "These look like photos from a brand's website."
        }
        body="Buyers trust photos you took yourself, and we check every listing before it goes live. Take your own photo of the item instead?"
        dismissOnOverlayClick={false}
        media={
          <div className="quality-thumbs">
            {photos
              .filter((photo) => catalogueIds.includes(photo.id))
              .map((photo) => (
                <span key={photo.id} className="quality-thumb">
                  <img src={photo.url} alt="" />
                </span>
              ))}
          </div>
        }
      >
        <PrimaryButton
          onClick={() => {
            setCatalogueOpen(false);
            setStep("photos");
          }}
        >
          {catalogueIds.length === 1 ? "Retake it" : "Retake them"}
        </PrimaryButton>
        <TextLink onClick={closeCatalogue}>
          {catalogueIds.length === 1 ? "Keep it and carry on" : "Keep them and carry on"}
        </TextLink>
      </BottomSheet>

      {/* Advisory only. Both ways out are real, and "Keep them" changes nothing. */}
      <BottomSheet
        open={!duplicateSheetOpen && !catalogueSheetOpen && qualitySheetOpen && Boolean(retakeTip) && flagged > 0}
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

      {/* The whole account step, for a seller who has one.
          NEW: she has already told us her name, her email and her number, so
          the only thing left to ask is whether the number is still right. A
          screen for one yes/no answer she has given before is a screen too
          many, so it is a sheet over her finished listing. */}
      <BottomSheet
        open={confirmPhoneOpen}
        onClose={() => (submitting ? undefined : setConfirmPhoneOpen(false))}
        heading="Is this still your WhatsApp?"
        body="This is the number buyers will message you on. It only becomes visible once your listing is live."
        dismissOnOverlayClick={false}
        media={<p className="confirm-phone-number">{formatPhone(savedPhone ?? "")}</p>}
      >
        {submitError && <p className="input-error-msg">{submitError}</p>}
        <PrimaryButton
          loading={submitting}
          loadingLabel="Saving your listing..."
          onClick={() => void finishSubmit({ ...account, phone: normalisePhone(savedPhone ?? "") })}
        >
          Yes, submit my listing
        </PrimaryButton>
        <TextLink
          disabled={submitting}
          onClick={() => {
            setConfirmPhoneOpen(false);
            setStep("account");
          }}
        >
          Use a different number
        </TextLink>
      </BottomSheet>

      {loginSheet}
      {successSheet}
    </>
  );
}
