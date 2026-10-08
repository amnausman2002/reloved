import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Both faces are self-hosted at build time by next/font, so the browser makes
// no request to Google Fonts at runtime. Weight is omitted on purpose: these
// are variable fonts, so omitting it loads the full range (Fraunces 300 and
// 400, Inter 400 and 500 are all used). Fraunces also needs its optical size
// axis, which design-system.md sets to 144 at display sizes.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Reloved",
  description: "Preloved women's clothing from Pakistani brands. Curated, not chaotic.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
