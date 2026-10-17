"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextLink from "@/components/ui/TextLink";
import SecondaryButton from "@/components/ui/SecondaryButton";
import BottomSheet from "@/components/ui/BottomSheet";
import { prepareBatch, preparePhotos } from "@/lib/photos";
import { GROUP_THUMB_EDGE, groupByTime, type PhotoGroup } from "@/lib/ai/groupRules";
import { MAX_BATCH_PHOTOS, MAX_LISTING_PHOTOS, type City } from "@/lib/constants";
import ReadingPhotos, { type ReadingCopy } from "../ReadingPhotos";
import SellForm from "../SellForm";
import AccountFlow from "../AccountFlow";
import { requestGroup, requestPhotoQuality, requestPrefill } from "../aiRequests";
import { prefillToForm } from "../prefillToForm";
import { flagFor, flaggedCount, slotNote } from "../qualityWording";
import { mergePrefill, type FormFields } from "../types";
import { formatPhone, normalisePhone, type AccountFields } from "../account";
import { submitListing } from "../submitListing";
import { localId } from "../ids";
import { firebaseAuth } from "@/lib/firebase/client";
import BulkCard from "./BulkCard";
import {
  isComplete,
  mergeCards,
  missingSummary,
  movePhoto,
  newCard,
  removeCard,
  removePhoto,
  setCover,
  splitCard,
  type BulkCard as Card,
  type BulkPhoto,
} from "./bulkState";

// Bulk listing ("Many items"), from the gallery to the approval queue.
//
//   pick        she chooses up to 30 photos
//   preparing   each photo converted and shrunk on the phone, 3 at a time
//   sorting     one Gemini call groups them into items (lib/ai/group.ts)
//   sortFailed  Try again, or Sort them myself (by capture time, no AI)
//   review      one card per item, each read by Call 1 and Call 2 as before
//   edit        the single-item form, for one card
//   account     the single-item account step, once for the whole batch
//
// Every listing is written by submitListing, the same code the single-item
// flow uses. There is no second road into the database.
//
// Nothing is saved until Submit. A reload loses the batch, which is accepted
// for now, and cannot corrupt anything: listings already submitted are whole.

type Step = "pick" | "preparing" | "sorting" | "sortFailed" | "review" | "edit" | "account";

/** Cards read at once. Each is two calls, so this is eight requests. */
const READ_CONCURRENCY = 4;
/** Listings saved at once, after the first (which creates her account). */
const SUBMIT_CONCURRENCY = 3;
/** When sorting stops being a normal wait and the screen says so. */
const SORT_SLOW_AFTER_MS = 25_000;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SORT_COPY: ReadingCopy = {
  lines: [
    "Looking through your photos...",
    "Matching photos of the same item...",
    "Checking close-ups against each item...",
    "Putting each item on its own listing...",
  ],
  slowLine: "Still sorting. Taking longer than usual today.",
  status: "Sorting your photos into listings",
  skip: "Sort them myself",
  slowSkip: "Sort them myself instead",
};

type PhotoSheet = { photoId: string; view: "menu" | "move" | "remove" };

type Props = {
  account: AccountFields;
  onAccountChange: (patch: Partial<AccountFields>) => void;
  signedInAs: string | null;
  savedPhone: string | null;
  profileCity: City | null;
  /** Tells SellFlow whether leaving would lose anything. */
  onWorkChange: (hasWork: boolean) => void;
  /** Back to the single-item flow. */
  onSingle: () => void;
};

export default function BulkFlow({
  account,
  onAccountChange,
  signedInAs,
  savedPhone,
  profileCity,
  onWorkChange,
  onSingle,
}: Props) {
  const [step, setStep] = useState<Step>("pick");

  // Refs are the source of truth for photos and cards, mirrored into state
  // for drawing. The reads finish in any order, long after the tap that
  // started them, and must see the cards as they are now, not as they were.
  const [photos, setPhotos] = useState<Record<string, BulkPhoto>>({});
  const photosRef = useRef<Record<string, BulkPhoto>>({});
  const [cards, setCards] = useState<Card[]>([]);
  const cardsRef = useRef<Card[]>([]);
  /** Photo ids in the order she picked them: the numbers the grouping call uses. */
  const orderRef = useRef<string[]>([]);

  const [notes, setNotes] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [slow, setSlow] = useState(false);
  const [sortError, setSortError] = useState<string | null>(null);
  const [sortedBy, setSortedBy] = useState<"ai" | "time" | "one">("ai");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [split, setSplit] = useState<{ cardId: string; selection: string[] } | null>(null);
  const [photoSheet, setPhotoSheet] = useState<PhotoSheet | null>(null);
  const [mergeFor, setMergeFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmPhoneOpen, setConfirmPhoneOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [posted, setPosted] = useState<{ count: number; covers: string[] }>({ count: 0, covers: [] });

  const pickRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);
  const flowAbortRef = useRef<AbortController>(new AbortController());
  const sortAbortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<string[]>([]);
  const activeReadsRef = useRef(0);

  // A fresh controller on every mount. React mounts, unmounts and remounts in
  // development, and aborting the one created with the ref left the flow
  // permanently "unmounted": photos prepared, then nothing.
  useEffect(() => {
    const urls = urlsRef.current;
    const flow = new AbortController();
    flowAbortRef.current = flow;
    return () => {
      flow.abort();
      sortAbortRef.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const hasWork = cards.length > 0 || step === "preparing" || step === "sorting" || step === "sortFailed";
  useEffect(() => onWorkChange(hasWork), [hasWork, onWorkChange]);

  // Back from editing a card, land on that card rather than the top.
  useEffect(() => {
    if (step !== "review" || !scrollTo) return;
    document.getElementById(`bulk-card-${scrollTo}`)?.scrollIntoView({ block: "center" });
    setScrollTo(null);
  }, [step, scrollTo]);

  function updatePhotos(change: (current: Record<string, BulkPhoto>) => Record<string, BulkPhoto>) {
    photosRef.current = change(photosRef.current);
    setPhotos(photosRef.current);
  }

  function updateCards(change: (current: Card[]) => Card[]) {
    cardsRef.current = change(cardsRef.current);
    setCards(cardsRef.current);
  }

  function makeCard(photoIds: string[], itemHint?: string): Card {
    return newCard(localId("card"), photoIds, profileCity ?? "", itemHint);
  }

  // Reading each card: Call 1 and Call 2, unchanged, a few cards at a time

  function enqueueRead(cardId: string) {
    queueRef.current.push(cardId);
    pumpReads();
  }

  function pumpReads() {
    while (activeReadsRef.current < READ_CONCURRENCY && queueRef.current.length > 0) {
      const cardId = queueRef.current.shift()!;
      activeReadsRef.current += 1;
      void readCard(cardId).finally(() => {
        activeReadsRef.current -= 1;
        pumpReads();
      });
    }
  }

  /** A failed read leaves the card blank with a normal form, never an error
   *  wall. A card merged away mid-read is simply not there to update. */
  async function readCard(cardId: string) {
    const card = cardsRef.current.find((item) => item.id === cardId);
    if (!card) return;
    // The AI routes take at most six. A card with more is told so on screen.
    const ids = card.photoIds.slice(0, MAX_LISTING_PHOTOS);
    const files = ids.map((id) => photosRef.current[id]?.file).filter((file): file is File => Boolean(file));
    const signal = flowAbortRef.current.signal;

    const [prefill, quality] = await Promise.all([
      requestPrefill(files, signal),
      requestPhotoQuality(files, signal),
    ]);
    if (signal.aborted) return;

    updatePhotos((current) => {
      const next = { ...current };
      ids.forEach((id, index) => {
        if (!next[id]) return;
        const flag = flagFor(quality.flags, index);
        // Bulk has no room for a sheet per card, so a website-looking photo
        // says so on the photo itself, ahead of any other note.
        next[id] = { ...next[id], note: flag?.looks_like_catalogue ? "Website photo?" : slotNote(flag) };
      });
      return next;
    });

    const retakeTip =
      !quality.skipped && quality.retakeTip && flaggedCount(quality.flags) > 0 ? quality.retakeTip : undefined;

    updateCards((current) =>
      current.map((item) => {
        if (item.id !== cardId) return item;
        if (!prefill.ok) return { ...item, status: "failed", prefillError: prefill.error, retakeTip };
        const prefilled = prefillToForm(prefill.listing);
        // Fills empty fields only, exactly as the single-item flow does.
        return { ...item, status: "ready", prefilled, fields: mergePrefill(item.fields, prefilled), retakeTip };
      }),
    );
  }

  // Pick, prepare, sort

  async function handlePick(list: File[]) {
    if (list.length === 0) return;
    setPickError(null);
    const files = list.slice(0, MAX_BATCH_PHOTOS);
    const nextNotes: string[] = [];
    if (list.length > MAX_BATCH_PHOTOS) {
      nextNotes.push(`We kept the first ${MAX_BATCH_PHOTOS} of your ${list.length} photos. You can list the rest in another batch.`);
    }

    setStep("preparing");
    setProgress({ done: 0, total: files.length });
    const prepared = await prepareBatch(files, GROUP_THUMB_EDGE, (done) =>
      setProgress({ done, total: files.length }),
    );
    if (flowAbortRef.current.signal.aborted) return;

    const map: Record<string, BulkPhoto> = {};
    const order: string[] = [];
    prepared.forEach((item, index) => {
      // A HEIC that would not convert cannot be shown, read or listed.
      if (!ALLOWED_TYPES.includes(item.file.type)) return;
      const id = localId();
      const url = URL.createObjectURL(item.file);
      urlsRef.current.push(url);
      map[id] = {
        id,
        url,
        file: item.file,
        thumb: item.thumb,
        problem: item.problem,
        // From the original, before resizing made a new file.
        meta: { name: files[index].name, lastModified: files[index].lastModified },
      };
      order.push(id);
    });

    const left = files.length - order.length;
    if (left > 0) {
      nextNotes.push(`${left} photo${left === 1 ? "" : "s"} could not be opened and ${left === 1 ? "was" : "were"} left out.`);
    }
    setNotes(nextNotes);

    if (order.length === 0) {
      setPickError("We could not open any of those photos. Try saving them as JPEG first.");
      setStep("pick");
      return;
    }

    photosRef.current = map;
    setPhotos(map);
    orderRef.current = order;

    if (order.length === 1) {
      buildCards([{ photos: [0] }], "one");
      return;
    }
    void sort();
  }

  async function sort() {
    const order = orderRef.current;
    const controller = new AbortController();
    sortAbortRef.current = controller;
    setSlow(false);
    setSortError(null);
    setStep("sorting");

    const slowTimer = window.setTimeout(() => setSlow(true), SORT_SLOW_AFTER_MS);
    const result = await requestGroup(
      order.map((id) => photosRef.current[id].thumb),
      order.map((id) => photosRef.current[id].meta),
      controller.signal,
    );
    window.clearTimeout(slowTimer);
    if (controller.signal.aborted) return;

    if (result.ok) {
      buildCards(result.groups, "ai");
    } else {
      setSortError(result.error);
      setStep("sortFailed");
    }
  }

  /** The no-AI way through: new card wherever there is a long gap between
   *  photos, or one card per photo if the times cannot be trusted. */
  function sortMyself() {
    sortAbortRef.current?.abort();
    const order = orderRef.current;
    buildCards(groupByTime(order.map((id) => photosRef.current[id].meta)), "time");
  }

  function buildCards(groups: PhotoGroup[], by: "ai" | "time" | "one") {
    const order = orderRef.current;
    const built = groups.map((group) => makeCard(group.photos.map((index) => order[index]), group.itemHint));
    cardsRef.current = built;
    setCards(built);
    setSortedBy(by);
    setStep("review");
    built.forEach((card) => enqueueRead(card.id));
  }

  // Corrections

  async function addPhotos(cardId: string, files: File[]) {
    const prepared = await preparePhotos(files);
    const added: BulkPhoto[] = prepared
      .filter((item) => ALLOWED_TYPES.includes(item.file.type))
      .map((item, index) => {
        const url = URL.createObjectURL(item.file);
        urlsRef.current.push(url);
        return {
          id: localId(),
          url,
          file: item.file,
          thumb: item.file,
          problem: item.problem,
          meta: { name: files[index]?.name ?? "", lastModified: files[index]?.lastModified ?? 0 },
        };
      });
    if (added.length === 0) return;
    updatePhotos((current) => ({ ...current, ...Object.fromEntries(added.map((photo) => [photo.id, photo])) }));
    updateCards((current) =>
      current.map((card) =>
        card.id === cardId ? { ...card, photoIds: [...card.photoIds, ...added.map((photo) => photo.id)] } : card,
      ),
    );
  }

  function handlePhotoTap(cardId: string, photoId: string) {
    if (split?.cardId === cardId) {
      setSplit({
        cardId,
        selection: split.selection.includes(photoId)
          ? split.selection.filter((id) => id !== photoId)
          : [...split.selection, photoId],
      });
      return;
    }
    setPhotoSheet({ photoId, view: "menu" });
  }

  function moveTo(target: string | "new") {
    if (!photoSheet) return;
    const { photoId } = photoSheet;
    if (target === "new") {
      const created = makeCard([]);
      updateCards((current) => movePhoto(current, photoId, { created }));
      enqueueRead(created.id);
    } else {
      updateCards((current) => movePhoto(current, photoId, { cardId: target }));
    }
    setPhotoSheet(null);
  }

  function confirmSplit() {
    if (!split) return;
    const created = makeCard([]);
    updateCards((current) => splitCard(current, split.cardId, split.selection, created));
    setSplit(null);
    enqueueRead(created.id);
  }

  /** Her city goes to every card that does not have one yet. Ten listings
   *  from one wardrobe are almost always from one city. */
  function changeFields(cardId: string, patch: Partial<FormFields>) {
    updateCards((current) =>
      current.map((card) => {
        if (card.id === cardId) return { ...card, fields: { ...card.fields, ...patch } };
        if (patch.city && !card.fields.city) return { ...card, fields: { ...card.fields, city: patch.city } };
        return card;
      }),
    );
  }

  // Submit

  const complete = cards.length > 0 && cards.every(isComplete);

  function startSubmit() {
    if (!complete) return;
    setSubmitError(null);
    if (savedPhone) setConfirmPhoneOpen(true);
    else setStep("account");
  }

  /** The first listing goes alone, because it is the one that creates her
   *  account. The rest go a few at a time. A listing that fails stays on the
   *  review screen; the ones that saved leave it, so a second Submit can
   *  never post anything twice. */
  async function submitAll(finished: AccountFields) {
    onAccountChange(finished);
    setSubmitting(true);
    setSubmitError(null);

    const batch = [...cardsRef.current];
    const saved: Card[] = [];
    let lastError: string | null = null;

    async function submitOne(card: Card) {
      const result = await submitListing(
        finished,
        card.fields,
        card.photoIds.map((id) => photosRef.current[id]),
        card.photoIds[0],
      );
      if (result.ok) saved.push(card);
      else lastError = result.error;
      return result;
    }

    const first = await submitOne(batch[0]);
    if (!first.ok) {
      setSubmitting(false);
      setSubmitError(first.error);
      return;
    }

    let next = 1;
    await Promise.all(
      Array.from({ length: SUBMIT_CONCURRENCY }, async () => {
        while (next < batch.length) await submitOne(batch[next++]);
      }),
    );

    const savedIds = new Set(saved.map((card) => card.id));
    updateCards((current) => current.filter((card) => !savedIds.has(card.id)));
    setPosted((current) => ({
      count: current.count + saved.length,
      covers: [...current.covers, ...saved.map((card) => photosRef.current[card.photoIds[0]]?.url ?? "")],
    }));
    setSubmitting(false);
    setConfirmPhoneOpen(false);

    if (saved.length < batch.length) {
      const failed = batch.length - saved.length;
      setStep("review");
      setSubmitError(
        `${saved.length} of ${batch.length} listings were saved. The ${failed} still here did not save: ${lastError ?? "try again."}`,
      );
      return;
    }
    setSuccessOpen(true);
  }

  // Sheet closers, stable so BottomSheet's focus handling runs once per open.
  const closePhotoSheet = useCallback(() => setPhotoSheet(null), []);
  const closeMerge = useCallback(() => setMergeFor(null), []);
  const closeDelete = useCallback(() => setDeleteFor(null), []);
  const closeSuccess = useCallback(() => setSuccessOpen(false), []);
  const closeConfirmPhone = useCallback(() => {
    if (!submitting) setConfirmPhoneOpen(false);
  }, [submitting]);

  // Screens

  const cardName = (card: Card, index: number) => card.fields.title.trim() || card.itemHint || `Listing ${index + 1}`;
  const coverOf = (card: Card) => photos[card.photoIds[0]]?.url;

  /** Other cards as tappable rows: first photo, name, photo count. NEW, built
   *  from .condition-option's row shape. Flagged for Bismah. */
  function targetList(excludeId: string | undefined, onPick: (cardId: string) => void) {
    return (
      <div className="bulk-targets">
        {cards.map((card, index) =>
          card.id === excludeId ? null : (
            <button key={card.id} type="button" className="bulk-target" onClick={() => onPick(card.id)}>
              {coverOf(card) ? <img src={coverOf(card)} alt="" /> : <span className="bulk-target-blank" />}
              <span className="condition-text">
                <span className="condition-text-label">{cardName(card, index)}</span>
                <span className="condition-text-desc">
                  {card.photoIds.length} photo{card.photoIds.length === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          ),
        )}
      </div>
    );
  }

  const successSheet = (
    <BottomSheet
      open={successOpen}
      onClose={closeSuccess}
      heading="All good so far!"
      body={`We'll review your ${posted.count === 1 ? "listing" : `${posted.count} listings`} and check your number is on WhatsApp. You'll hear from us within a day.`}
      media={
        <div className="quality-thumbs">
          {posted.covers.slice(0, 4).map((url, index) => (
            <span key={index} className="quality-thumb">
              {url && <img src={url} alt="" />}
            </span>
          ))}
        </div>
      }
    >
      <PrimaryButton
        onClick={() => {
          setSuccessOpen(false);
          // Her profile, where her listings are, as in the single-item flow.
          const uid = firebaseAuth().currentUser?.uid;
          window.location.assign(uid ? `/seller/${uid}` : "/");
        }}
      >
        View my listings
      </PrimaryButton>
      <TextLink
        onClick={() => {
          setSuccessOpen(false);
          window.location.assign("/sell");
        }}
      >
        List more items
      </TextLink>
    </BottomSheet>
  );

  if (step === "pick") {
    return (
      <div className="sell-step">
        <h1 className="text-h1 sell-heading">Many items.</h1>
        <p className="sell-sub">
          Choose up to {MAX_BATCH_PHOTOS} photos of the things you&apos;re selling, a few of each. We&apos;ll
          sort them into listings and fill in what we can.
        </p>
        <ul className="bulk-pick-tips">
          <li>Photograph one item at a time, then move on to the next.</li>
          <li>Two to six photos of each item, including any label or flaw.</li>
          <li>Choose them in the order you took them.</li>
        </ul>
        {pickError && <p className="input-error-msg">{pickError}</p>}
        <div className="sell-footer">
          <PrimaryButton onClick={() => pickRef.current?.click()}>Choose photos</PrimaryButton>
          <TextLink onClick={onSingle}>List one item instead</TextLink>
          {/* accept="image/*" and never image/heic: see PhotoSource. */}
          <input
            ref={pickRef}
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            tabIndex={-1}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void handlePick(files);
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "preparing") {
    return (
      <div className="sell-step reading-step">
        <div className="reading-middle">
          <p className="reading-line is-still" role="status">
            Getting your photos ready... {progress.done} of {progress.total}
          </p>
        </div>
      </div>
    );
  }

  if (step === "sorting") {
    const deck = orderRef.current.slice(0, 6).map((id) => ({ id, url: photos[id]?.url ?? "" }));
    return <ReadingPhotos photos={deck} slow={slow} onSkip={sortMyself} copy={SORT_COPY} />;
  }

  if (step === "sortFailed") {
    return (
      <div className="sell-step">
        <h1 className="text-h1 sell-heading">We couldn&apos;t sort these.</h1>
        <p className="sell-sub">
          Your photos are all still here. Try again, or we can split them by when you took them and you fix the
          rest.
        </p>
        {sortError && <p className="input-hint">{sortError}</p>}
        <div className="sell-footer">
          <PrimaryButton onClick={() => void sort()}>Try again</PrimaryButton>
          <TextLink onClick={sortMyself}>Sort them myself</TextLink>
        </div>
      </div>
    );
  }

  const editing = cards.find((card) => card.id === editingId);
  if (step === "edit" && editing) {
    const index = cards.indexOf(editing);
    const back = () => {
      setScrollTo(editing.id);
      setEditingId(null);
      setStep("review");
    };
    return (
      <div className="sell-step">
        <div className="sell-step-head">
          <h1 className="text-h1 sell-heading">
            Listing {index + 1} of {cards.length}.
          </h1>
          <TextLink onClick={back}>All listings</TextLink>
        </div>
        <SellForm
          photos={editing.photoIds.map((id) => photos[id]).filter(Boolean)}
          coverId={editing.photoIds[0] ?? null}
          fields={editing.fields}
          onChange={(patch) => changeFields(editing.id, patch)}
          prefilled={editing.prefilled}
          prefillError={editing.status === "failed" ? (editing.prefillError ?? "") : null}
          // Photos are moved, added and removed on the review screen.
          onBackToPhotos={back}
          onSubmit={back}
          submitLabel="Done"
          requireComplete={false}
        />
      </div>
    );
  }

  if (step === "account") {
    const first = cards[0];
    return (
      <>
        <AccountFlow
          listing={{
            title: `${cards.length} listings`,
            price: "",
            coverUrl: first ? coverOf(first) : undefined,
            summary: "Ready to post together",
          }}
          fields={account}
          onChange={onAccountChange}
          onBack={() => setStep("review")}
          busy={submitting}
          submitError={submitError}
          signedInAs={signedInAs}
          onDone={(finished) => void submitAll(finished)}
        />
        {successSheet}
      </>
    );
  }

  // Review
  const lines = missingSummary(cards);
  const reading = cards.filter((card) => card.status === "reading").length;
  const photoCount = cards.reduce((sum, card) => sum + card.photoIds.length, 0);
  const sheetPhoto = photoSheet ? photos[photoSheet.photoId] : undefined;
  const sheetCard = photoSheet ? cards.find((card) => card.photoIds.includes(photoSheet.photoId)) : undefined;

  return (
    <>
      <div className="sell-step">
        <h1 className="text-h1 sell-heading">Your listings.</h1>
        <p className="sell-sub">
          {cards.length === 0
            ? "Nothing left in this batch."
            : sortedBy === "time"
              ? `We split your ${photoCount} photos by when you took them, into ${cards.length} listings. Move or merge any that are wrong, then add a price to each.`
              : `We sorted your ${photoCount} photos into ${cards.length} listing${cards.length === 1 ? "" : "s"}. Some details were filled in by AI based on your photos. Fix anything we got wrong, then add a price to each.`}
        </p>
        {notes.map((note) => (
          <p key={note} className="input-hint">
            {note}
          </p>
        ))}

        <div className="bulk-cards">
          {cards.map((card, index) => (
            <BulkCard
              key={card.id}
              card={card}
              index={index}
              photos={photos}
              canMerge={cards.length > 1}
              splitting={split?.cardId === card.id}
              splitSelection={split?.cardId === card.id ? split.selection : []}
              onPhotoTap={(photoId) => handlePhotoTap(card.id, photoId)}
              onAddPhotos={(files) => void addPhotos(card.id, files)}
              onEdit={() => {
                setSplit(null);
                setEditingId(card.id);
                setStep("edit");
                window.scrollTo(0, 0);
              }}
              onMerge={() => setMergeFor(card.id)}
              onSplit={() => setSplit({ cardId: card.id, selection: [] })}
              onDelete={() => setDeleteFor(card.id)}
              onConfirmSplit={confirmSplit}
              onCancelSplit={() => setSplit(null)}
            />
          ))}
        </div>

        {/* Same pattern as "Build my listing": the button is disabled, and
            the lines above it say exactly what is missing and where. */}
        <div className="sell-footer">
          {submitError && <p className="input-error-msg">{submitError}</p>}
          {reading > 0 && (
            <p className="input-hint">
              Still reading {reading} listing{reading === 1 ? "" : "s"}. You can start adding prices now.
            </p>
          )}
          {lines.length > 0 && (
            <ul className="bulk-missing">
              {lines.map((line) => (
                <li key={line.key}>
                  <button
                    type="button"
                    className="bulk-missing-item"
                    onClick={() =>
                      document
                        .getElementById(`bulk-card-${line.firstCardId}`)
                        ?.scrollIntoView({ block: "center", behavior: "smooth" })
                    }
                  >
                    {line.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cards.length > 0 && (
            <PrimaryButton onClick={startSubmit} disabled={!complete || submitting}>
              {`Submit ${cards.length} listing${cards.length === 1 ? "" : "s"}`}
            </PrimaryButton>
          )}
          {cards.length === 0 && <PrimaryButton onClick={() => window.location.assign("/sell")}>Start again</PrimaryButton>}
        </div>
      </div>

      {/* One photo: move it, make it the cover, or remove it. */}
      <BottomSheet
        open={Boolean(photoSheet && sheetPhoto && sheetCard)}
        onClose={closePhotoSheet}
        heading={
          photoSheet?.view === "move"
            ? "Move to which listing?"
            : photoSheet?.view === "remove"
              ? "Remove this photo?"
              : "This photo"
        }
        body={
          photoSheet?.view === "remove"
            ? "It will be taken out of this batch."
            : photoSheet?.view === "move"
              ? "It goes at the end of that listing's photos."
              : undefined
        }
        media={
          sheetPhoto && photoSheet?.view !== "move" ? (
            <div className="quality-thumbs">
              <span className="quality-thumb">
                <img src={sheetPhoto.url} alt="" />
              </span>
            </div>
          ) : undefined
        }
      >
        {photoSheet?.view === "menu" && sheetCard && (
          <>
            <PrimaryButton onClick={() => setPhotoSheet({ ...photoSheet, view: "move" })}>
              Move to another listing
            </PrimaryButton>
            {sheetCard.photoIds[0] !== photoSheet.photoId && (
              <SecondaryButton
                onClick={() => {
                  updateCards((current) => setCover(current, sheetCard.id, photoSheet.photoId));
                  setPhotoSheet(null);
                }}
              >
                Make this the cover
              </SecondaryButton>
            )}
            <TextLink onClick={() => setPhotoSheet({ ...photoSheet, view: "remove" })}>Remove photo</TextLink>
          </>
        )}
        {photoSheet?.view === "move" && (
          <>
            {targetList(sheetCard?.id, (cardId) => moveTo(cardId))}
            <PrimaryButton onClick={() => moveTo("new")}>New listing</PrimaryButton>
          </>
        )}
        {photoSheet?.view === "remove" && (
          <>
            <PrimaryButton
              onClick={() => {
                updateCards((current) => removePhoto(current, photoSheet.photoId));
                setPhotoSheet(null);
              }}
            >
              Remove it
            </PrimaryButton>
            <TextLink onClick={closePhotoSheet}>Keep it</TextLink>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={mergeFor !== null}
        onClose={closeMerge}
        heading="Merge with which listing?"
        body="The photos go together into one listing. The details of the one higher up the list are kept."
      >
        {mergeFor &&
          targetList(mergeFor, (otherId) => {
            updateCards((current) => mergeCards(current, mergeFor, otherId));
            setMergeFor(null);
          })}
      </BottomSheet>

      <BottomSheet
        open={deleteFor !== null}
        onClose={closeDelete}
        heading="Delete this listing?"
        body="Its photos will be taken out of this batch. Nothing else changes."
      >
        <PrimaryButton
          onClick={() => {
            if (deleteFor) updateCards((current) => removeCard(current, deleteFor));
            setDeleteFor(null);
          }}
        >
          Delete it
        </PrimaryButton>
        <TextLink onClick={closeDelete}>Keep it</TextLink>
      </BottomSheet>

      {/* The account step for a seller we already have a number for, the same
          sheet the single-item flow uses. */}
      <BottomSheet
        open={confirmPhoneOpen}
        onClose={closeConfirmPhone}
        heading="Is this still your WhatsApp?"
        body="This is the number buyers will message you on. It only becomes visible once your listings are live."
        dismissOnOverlayClick={false}
        media={<p className="confirm-phone-number">{formatPhone(savedPhone ?? "")}</p>}
      >
        {submitError && <p className="input-error-msg">{submitError}</p>}
        <PrimaryButton
          loading={submitting}
          loadingLabel={`Saving your listings...`}
          onClick={() => void submitAll({ ...account, phone: normalisePhone(savedPhone ?? "") })}
        >
          {`Yes, submit ${cards.length} listing${cards.length === 1 ? "" : "s"}`}
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

      {successSheet}
    </>
  );
}
