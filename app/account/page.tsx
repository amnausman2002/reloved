import AuthPanel from "./AuthPanel";

export const metadata = {
  title: "Sign up | Reloved",
};

// The way into an account from the menu, for a seller who has not listed
// anything yet.
//
// NEW 13 Oct. Until now the only account screen was the one inside the sell
// flow (app/sell/AccountFlow.tsx), which is reached from Submit listing and
// nowhere else. That is still the main road in and has not changed: a seller
// who starts with photos is never asked for an account until her listing is
// ready. This page is the other door, for the menu's "Sign up | Log in", and
// it is deliberately the same screen with the listing card taken off.
//
// It does NOT ask for her WhatsApp number. The number is what buyers reach her
// on, so it belongs to a listing, and the sell flow still collects it at
// submit. Asking for it here would be asking a stranger for her phone number
// before she has shown us anything.
export default function AccountPage() {
  return <AuthPanel />;
}
