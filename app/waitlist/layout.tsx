import type { ReactNode } from "react";
import GoogleAnalytics from "./GoogleAnalytics";

export const metadata = {
  title: "Reloved | Join the waitlist",
  description:
    "Buy and sell preloved women's fashion in Pakistan. Zero commission. Join the waitlist and be first in.",
};

export default function WaitlistLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GoogleAnalytics />
    </>
  );
}
