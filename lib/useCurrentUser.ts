import { getSeller } from "@/lib/sample-data";

// TEMPORARY — replace with Firebase Auth once it exists. There is no
// account/sign-in anywhere in the app yet, so there is no real way to know
// who is viewing a page. This is the ONLY place that mock id should be
// referenced; everything else should go through this hook.
const CURRENT_SELLER_ID = "s1";

export function useCurrentUser() {
  return getSeller(CURRENT_SELLER_ID);
}
