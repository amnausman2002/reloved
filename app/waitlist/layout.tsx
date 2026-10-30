import type { Metadata } from "next";
import type { ReactNode } from "react";
import GoogleAnalytics from "./GoogleAnalytics";
import { WAITLIST_DOMAIN } from "./domain";

const title = "Reloved | Join the waitlist";
const description =
  "Buy and sell preloved women's fashion in Pakistan. Zero commission. Join the waitlist and be first in.";

// The Open Graph tags are what WhatsApp, Instagram and iMessage read to draw a
// link preview. The image must be an absolute address, hence metadataBase.
// Its grain is softened slightly so it does not break up when Slack or
// WhatsApp shrink it to a thumbnail. Give a replacement a new file name:
// both apps keep the image they fetched first.
export const metadata: Metadata = {
  metadataBase: new URL(`https://${WAITLIST_DOMAIN}`),
  title,
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Reloved",
    title,
    description,
    locale: "en_PK",
    images: [
      {
        url: "/og-image-2.jpg",
        width: 1200,
        height: 630,
        alt: "The reloved. wordmark on a pink and orange gradient",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image-2.jpg"],
  },
};

export default function WaitlistLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GoogleAnalytics />
    </>
  );
}
