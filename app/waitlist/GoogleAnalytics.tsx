import Script from "next/script";

// GA4, on /waitlist only: it is loaded from this route's layout and nowhere
// else. Renders nothing when NEXT_PUBLIC_GA_ID is not set.
//
// NEXT_PUBLIC_ values are baked in at build time, so the ID has to be in
// apphosting.yaml with BUILD availability, not just RUNTIME.

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(GA_ID)});`}
      </Script>
    </>
  );
}
