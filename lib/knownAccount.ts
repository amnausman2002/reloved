// Whether someone has signed in on this phone before, and with which email.
//
// Firebase keeps her signed in until she taps Log out, so this only matters
// after that: the sell flow uses it to ask a returning seller to log in,
// with her email already in the box, instead of showing her a sign-up form
// for an account she already has.
//
// A hint, not a login. It holds an email address and nothing else, and it
// grants nothing: she still types her password. It is kept on Log out on
// purpose, because remembering her after she has signed out is its whole job.
// "New here? Create an account" in the sheet is the way past it on a phone
// shared with someone else.

const KEY = "reloved.known-email";

export function rememberAccount(email: string | null | undefined): void {
  if (!email) return;
  try {
    window.localStorage.setItem(KEY, email);
  } catch {
    // Private browsing. She gets the sign-up screen, as before.
  }
}

export function knownAccountEmail(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
