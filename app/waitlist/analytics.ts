// GA4 events for the waitlist. Does nothing when GA is not loaded, so a missing
// NEXT_PUBLIC_GA_ID costs nothing and throws nothing.
//
// Never pass an email or a phone number in here. GA4's terms forbid it, and
// we promised her we'd never share her number.

type GtagParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: GtagParams) => void;
  }
}

export function track(name: string, params: GtagParams): void {
  window.gtag?.("event", name, params);
}

/** form_start fires once per page load, the first time she touches the form. */
let formStarted = false;

export function trackFormStart(): void {
  if (formStarted) return;
  formStarted = true;
  track("form_start", {});
}
