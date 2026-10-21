// The listing she is in the middle of, saved on this phone.
//
// Until 21 Oct the photos only existed as object URLs in the tab, so leaving
// the page, a reload, or the phone killing the browser in the background threw
// away an item she might not have in her hands again. Now the flow writes its
// state here as she goes, and /sell offers to pick it up when she comes back.
//
// IndexedDB rather than localStorage, because localStorage holds strings only
// and caps out around 5 MB. IndexedDB stores the prepared photo Files as they
// are: about 0.2 MB each, so a 30-photo batch is a few megabytes.
//
// Nothing here leaves the phone, and nothing needs an account. It is a
// convenience, not a record: private browsing, a full disk or a cleared
// browser lose it, and every function here fails quietly so the flow carries
// on exactly as it did before drafts existed.
//
// One draft at a time, single or bulk. Starting again replaces it, and a
// successful submit deletes it, so a finished listing is never left sitting on
// a phone that may be shared with the rest of the family.

import type { PhotoMeta } from "@/lib/ai/groupRules";
import type { Prefilled } from "./prefillToForm";
import type { FormFields } from "./types";
import type { BulkCard } from "./bulk/bulkState";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";

const DB_NAME = "reloved-sell";
const DB_VERSION = 1;
const DRAFTS = "drafts";
const PHOTOS = "photos";
const KEY = "current";

/** A draft older than this is dropped rather than offered. A week is long
 *  enough to come back to, and short enough that she still has the item. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** A photo's metadata. The File itself is stored separately, once, by id. */
export type DraftPhoto = { id: string; problem?: string; note?: string };

export type SingleDraft = {
  kind: "single";
  /** Where to put her back. A draft saved mid-read goes back to the photos:
   *  the read itself cannot be resumed, so she taps Build again. */
  step: "photos" | "details";
  photos: DraftPhoto[];
  coverId: string | null;
  fields: FormFields;
  prefilled: Prefilled;
};

export type BulkDraft = {
  kind: "bulk";
  photos: (DraftPhoto & { meta: PhotoMeta })[];
  /** The order she picked them in, which is what grouping numbers them by. */
  order: string[];
  cards: BulkCard[];
  notes: string[];
  sortedBy: "ai" | "time" | "one";
};

export type Draft = SingleDraft | BulkDraft;

/** The Files for one photo. `thumb` is the small copy bulk sends to grouping. */
export type DraftFiles = { file: File; thumb?: File };

export type LoadedDraft = {
  draft: Draft;
  files: Record<string, DraftFiles>;
  savedAt: number;
  /** Who was signed in when it was last saved, if anyone. The Drafts tab on
   *  a profile shows it only to that account, or to anyone if it was made
   *  signed out, so a shared phone does not show one person's draft on
   *  another person's profile. */
  ownerUid?: string;
};

type StoredDraft = { draft: Draft; savedAt: number; ownerUid?: string };

function currentUid(): string | undefined {
  try {
    return firebaseConfigured() ? firebaseAuth().currentUser?.uid : undefined;
  } catch {
    return undefined;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS);
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("blocked"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Whether drafts work in this browser at all, and the draft if there is one.
 *  `works` is what decides whether the leave sheet can promise she will find
 *  her listing here when she comes back. */
export async function loadDraft(): Promise<{ works: boolean; loaded: LoadedDraft | null }> {
  if (typeof indexedDB === "undefined") return { works: false, loaded: null };
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return { works: false, loaded: null };
  }
  try {
    const tx = db.transaction([DRAFTS, PHOTOS], "readonly");
    const stored = (await result(tx.objectStore(DRAFTS).get(KEY))) as StoredDraft | undefined;
    if (!stored) return { works: true, loaded: null };

    if (Date.now() - stored.savedAt > MAX_AGE_MS) {
      db.close();
      await clearDraft();
      return { works: true, loaded: null };
    }

    const photoStore = tx.objectStore(PHOTOS);
    const files: Record<string, DraftFiles> = {};
    for (const photo of stored.draft.photos) {
      const saved = (await result(photoStore.get(photo.id))) as DraftFiles | undefined;
      if (saved?.file) files[photo.id] = saved;
    }
    return {
      works: true,
      loaded: { draft: stored.draft, files, savedAt: stored.savedAt, ownerUid: stored.ownerUid },
    };
  } catch {
    // A draft we cannot read is a draft we do not offer.
    return { works: true, loaded: null };
  } finally {
    db.close();
  }
}

/** Saves the draft, writing only the photos that are new since the last save
 *  and deleting the ones she removed. Typing in the form rewrites a few
 *  hundred bytes, not every photo. */
export async function saveDraft(draft: Draft, files: Record<string, DraftFiles>): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction([DRAFTS, PHOTOS], "readwrite");
      const photoStore = tx.objectStore(PHOTOS);
      const wanted = new Set(draft.photos.map((photo) => photo.id));
      const existing = new Set((await result(photoStore.getAllKeys())).map(String));

      existing.forEach((id) => {
        if (!wanted.has(id)) photoStore.delete(id);
      });
      wanted.forEach((id) => {
        if (!existing.has(id) && files[id]) photoStore.put(files[id], id);
      });
      const stored: StoredDraft = { draft, savedAt: Date.now(), ownerUid: currentUid() };
      tx.objectStore(DRAFTS).put(stored, KEY);
      await done(tx);
      return true;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

export async function clearDraft(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction([DRAFTS, PHOTOS], "readwrite");
      tx.objectStore(DRAFTS).clear();
      tx.objectStore(PHOTOS).clear();
      await done(tx);
    } finally {
      db.close();
    }
  } catch {
    // Nothing to do. An old draft expires on its own.
  }
}
