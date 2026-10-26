import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { HemloNav } from "@/components/nav/hemlo-nav";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#F6F5F2",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nocapblr.com"),
  title: { default: "NoCapBLR | Before You Go, Know.", template: "%s | NoCapBLR" },
  description: "A Bengaluru place-discovery platform for candid local experiences, useful context, and location-aware reviews.",
  applicationName: "NoCapBLR",
  authors: [{ name: "NoCapBLR", url: "https://nocapblr.com" }],
  creator: "NoCapBLR",
  publisher: "NoCapBLR",
  formatDetection: { email: false, address: true, telephone: false },
  alternates: { canonical: "https://nocapblr.com" },
  openGraph: {
    title: "NoCapBLR | Before You Go, Know.",
    description: "Candid local context for Bengaluru places, before you visit.",
    url: "https://nocapblr.com",
    siteName: "NoCapBLR",
    images: [{ url: "/nocap-logo.png", width: 1200, height: 630, alt: "NoCapBLR" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "NoCapBLR | Before You Go, Know.", description: "Candid local context for Bengaluru places, before you visit.", images: ["/nocap-logo.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://nocapblr.com/#organization", name: "NoCapBLR", url: "https://nocapblr.com", logo: "https://nocapblr.com/nocap-logo.png", description: "A Bengaluru place-discovery platform for candid local experiences and location-aware reviews." },
    { "@type": "WebSite", "@id": "https://nocapblr.com/#website", url: "https://nocapblr.com", name: "NoCapBLR", publisher: { "@id": "https://nocapblr.com/#organization" } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-[#F6F5F2]`}>
      <head><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} /></head>
      <body suppressHydrationWarning className="flex min-h-screen h-full flex-col bg-[#F6F5F2] text-[#18181B]">
        <GoogleAnalytics />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only">Skip to content</a>
        <HemloNav />
        {children}
      </body>
    </html>
  );
}
