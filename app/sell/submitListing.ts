// What happens when she taps Submit on the last account screen.
//
// Three steps, in this order, because each needs the one before it:
//   1. Create her Firebase account, which is what gives us a seller id
//   2. Upload the photos to Cloud Storage as her, which storage.rules allows
//   3. POST the listing to our own route, which writes it as "pending"
//
// Photos go straight from the browser to Storage rather than through our
// server. Six photos is several megabytes, and sending them to Cloud Run only
// to forward them to Storage would double the transfer and the wait.
//
// The listing itself cannot take that shortcut: firestore.rules denies every
// client write to /listings on purpose, so that nobody can set their own
// status to "live" and skip the queue.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseAuth, firebaseStorage } from "@/lib/firebase/client";
import { toE164, normalisePhone, type AccountFields } from "./account";
import type { FormFields, SellPhoto } from "./types";

export type SubmitResult =
  | { ok: true; listingId: string }
  | { ok: false; error: string; field?: "email" | "password" };

/** Firebase's error codes are not for reading aloud. This is the only place
 *  that turns them into something a seller should see. */
function signUpError(code: string): { error: string; field?: "email" | "password" } {
  switch (code) {
    case "auth/email-already-in-use":
      return {
        error: "There is already an account with that email. Use a different one, or sign in.",
        field: "email",
      };
    case "auth/invalid-email":
      return { error: "That does not look like an email address.", field: "email" };
    case "auth/weak-password":
      return { error: "That password is too easy to guess. Try a longer one.", field: "password" };
    case "auth/network-request-failed":
      return { error: "We could not reach the internet. Check your connection and try again." };
    default:
      return { error: "We could not create your account. Try again in a moment." };
  }
}

/** Signs her up, or signs her in if this email is already hers.
 *
 *  The sign-in fallback exists because a seller who submitted a listing last
 *  week and comes back to list another will type the same email, and being
 *  told "already in use" at the end of a long form is a terrible place to
 *  find out. If the password is wrong we do have to stop her. */
async function createOrSignIn(
  email: string,
  password: string,
  fullName: string,
): Promise<{ ok: true; user: FirebaseUser } | { ok: false; error: string; field?: "email" | "password" }> {
  const auth = firebaseAuth();
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Not the same as our User.display_name, which is first name only. This
    // is Firebase's own profile, useful in the Auth console when we are
    // working out who someone is.
    await updateProfile(credential.user, { displayName: fullName });
    return { ok: true, user: credential.user };
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code !== "auth/email-already-in-use") return { ok: false, ...signUpError(code) };

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { ok: true, user: credential.user };
    } catch {
      return {
        ok: false,
        error: "That email already has an account, and that password does not match it.",
        field: "password",
      };
    }
  }
}

/** Uploads one photo and returns its public URL.
 *
 *  The path is listings/{uid}/{something}, which is the shape storage.rules
 *  allows her to write to. She cannot upload into anyone else's folder. */
async function uploadPhoto(uid: string, photo: SellPhoto, index: number): Promise<string> {
  const extension = photo.file.type === "image/png" ? "png" : photo.file.type === "image/webp" ? "webp" : "jpg";
  const name = `${Date.now()}-${index}.${extension}`;
  const storageRef = ref(firebaseStorage(), `listings/${uid}/${name}`);
  await uploadBytes(storageRef, photo.file, { contentType: photo.file.type });
  return getDownloadURL(storageRef);
}

export async function submitListing(
  account: AccountFields,
  fields: FormFields,
  photos: SellPhoto[],
  coverId: string | null,
): Promise<SubmitResult> {
  const created = await createOrSignIn(
    account.email.trim(),
    account.password,
    account.fullName.trim(),
  );
  if (!created.ok) return created;

  const { user } = created;

  let urls: string[];
  try {
    // In parallel: six sequential uploads on a phone connection is a long
    // wait for no reason.
    urls = await Promise.all(photos.map((photo, index) => uploadPhoto(user.uid, photo, index)));
  } catch {
    return {
      ok: false,
      error: "Your photos did not finish uploading. Check your connection and try again.",
    };
  }

  const idToken = await user.getIdToken();

  const response = await fetch("/api/listings/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      account: {
        fullName: account.fullName.trim(),
        phone: normalisePhone(account.phone) ? normalisePhone(account.phone) : null,
      },
      listing: {
        title: fields.title.trim(),
        description: fields.description.trim(),
        brand: fields.brand,
        brandOther: fields.brandOther.trim(),
        category: fields.category,
        colour: fields.colour,
        size: fields.size,
        condition: fields.condition,
        isReplica: fields.isReplica,
        price: fields.price,
        city: fields.city,
        material: fields.material,
      },
      photos: photos.map((photo, index) => ({
        url: urls[index],
        position: index,
        // The cover was moved to the front when she picked it, so index 0 is
        // usually it. Matching on id rather than position keeps this true even
        // if that ever changes.
        is_cover: coverId ? photo.id === coverId : index === 0,
        quality_flags: null,
      })),
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    return { ok: false, error: result?.error ?? "We could not save your listing. Try again." };
  }

  return { ok: true, listingId: result.listingId };
}

/** Exported for the one place that needs to show her number back to her. */
export { toE164 };
