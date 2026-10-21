// Listings she started and has not posted, saved on this phone.
//
// Until 21 Oct the photos only existed as object URLs in the tab, so leaving
// the page, a reload, or the phone killing the browser in the background threw
// away an item she might not have in her hands again. Now the flow writes its
// state here as she goes.
//
// A draft never opens by itself. Sell always starts a fresh listing; a draft
// is opened only from the Drafts tab on her profile (/sell?resume=<id>). That
// is why there can be several: starting something new must never overwrite
// the one she left.
//
// IndexedDB rather than localStorage, because localStorage holds strings only
// and caps out around 5 MB. IndexedDB stores the prepared photo Files as they
// are: about 0.2 MB each, so a 30-photo batch is a few megabytes.
//
// Nothing here leaves the phone, and nothing needs an account. It is a
// convenience, not a record: private browsing, a full disk or a cleared
// browser lose it, and every function here fails quietly so the flow carries
// on exactly as it did before drafts existed. A successful submit deletes its
// draft, so a finished listing is never left on a phone that may be shared.

import type { PhotoMeta } from "@/lib/ai/groupRules";
import type { Prefilled } from "./prefillToForm";
import type { FormFields } from "./types";
import type { BulkCard } from "./bulk/bulkState";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";

const DB_NAME = "reloved-sell";
/** 2 since drafts became several, keyed by id. Version 1 held one draft under
 *  a fixed key and is dropped on upgrade. */
const DB_VERSION = 2;
const DRAFTS = "drafts";
/** Keyed `${draftId}/${photoId}`, so one draft's photos are one key range. */
const PHOTOS = "photos";

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
  id: string;
  draft: Draft;
  files: Record<string, DraftFiles>;
  savedAt: number;
  /** Who was signed in when it was last saved, if anyone. The Drafts tab on
   *  a profile shows it only to that account, or to anyone if it was made
   *  signed out, so a shared phone does not show one person's draft on
   *  another person's profile. */
  ownerUid?: string;
};

type StoredDraft = { id: string; draft: Draft; savedAt: number; ownerUid?: string };

export function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentUid(): string | undefined {
  try {
    return firebaseConfigured() ? firebaseAuth().currentUser?.uid : undefined;
  } catch {
    return undefined;
  }
}

function photoRange(draftId: string): IDBKeyRange {
  return IDBKeyRange.bound(`${draftId}/`, `${draftId}/￿`);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Version 1's single draft is not worth migrating.
      for (const name of [DRAFTS, PHOTOS]) {
        if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
        db.createObjectStore(name);
      }
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

async function withFiles(photoStore: IDBObjectStore, stored: StoredDraft): Promise<LoadedDraft> {
  const files: Record<string, DraftFiles> = {};
  for (const photo of stored.draft.photos) {
    const saved = (await result(photoStore.get(`${stored.id}/${photo.id}`))) as DraftFiles | undefined;
    if (saved?.file) files[photo.id] = saved;
  }
  return { id: stored.id, draft: stored.draft, files, savedAt: stored.savedAt, ownerUid: stored.ownerUid };
}

/** Whether drafts work in this browser at all. Decides whether leaving Sell
 *  needs a warning. */
export async function draftsWork(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    (await openDb()).close();
    return true;
  } catch {
    return false;
  }
}

/** Every draft on this phone, newest first, with expired ones deleted on the
 *  way. A draft whose photos have all gone is not a draft. */
export async function listDrafts(): Promise<LoadedDraft[]> {
  if (typeof indexedDB === "undefined") return [];
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return [];
  }
  const expired: string[] = [];
  const found: LoadedDraft[] = [];
  try {
    const tx = db.transaction([DRAFTS, PHOTOS], "readonly");
    const all = (await result(tx.objectStore(DRAFTS).getAll())) as StoredDraft[];
    const photoStore = tx.objectStore(PHOTOS);
    for (const stored of all) {
      if (Date.now() - stored.savedAt > MAX_AGE_MS) {
        expired.push(stored.id);
        continue;
      }
      const loaded = await withFiles(photoStore, stored);
      if (Object.keys(loaded.files).length > 0) found.push(loaded);
    }
  } catch {
    // Whatever was read before the failure is still worth showing.
  } finally {
    db.close();
  }
  for (const id of expired) await deleteDraft(id);
  return found.sort((a, b) => b.savedAt - a.savedAt);
}

export async function loadDraft(id: string): Promise<LoadedDraft | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction([DRAFTS, PHOTOS], "readonly");
      const stored = (await result(tx.objectStore(DRAFTS).get(id))) as StoredDraft | undefined;
      if (!stored || Date.now() - stored.savedAt > MAX_AGE_MS) return null;
      const loaded = await withFiles(tx.objectStore(PHOTOS), stored);
      return Object.keys(loaded.files).length > 0 ? loaded : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Saves one draft, writing only the photos that are new since its last save
 *  and deleting the ones she removed. Typing in the form rewrites a few
 *  hundred bytes, not every photo. */
export async function saveDraft(id: string, draft: Draft, files: Record<string, DraftFiles>): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction([DRAFTS, PHOTOS], "readwrite");
      const photoStore = tx.objectStore(PHOTOS);
      const wanted = new Set(draft.photos.map((photo) => `${id}/${photo.id}`));
      const existing = new Set((await result(photoStore.getAllKeys(photoRange(id)))).map(String));

      existing.forEach((key) => {
        if (!wanted.has(key)) photoStore.delete(key);
      });
      draft.photos.forEach((photo) => {
        const key = `${id}/${photo.id}`;
        if (!existing.has(key) && files[photo.id]) photoStore.put(files[photo.id], key);
      });
      const stored: StoredDraft = { id, draft, savedAt: Date.now(), ownerUid: currentUid() };
      tx.objectStore(DRAFTS).put(stored, id);
      await done(tx);
      return true;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction([DRAFTS, PHOTOS], "readwrite");
      tx.objectStore(DRAFTS).delete(id);
      tx.objectStore(PHOTOS).delete(photoRange(id));
      await done(tx);
    } finally {
      db.close();
    }
  } catch {
    // Nothing to do. An old draft expires on its own.
  }
}
