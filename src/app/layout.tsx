import type { Metadata } from "next";
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
  metadataBase: new URL("https://www.nocapblr.com"),
  title: {
    default: "NoCapBLR — Real Reviews of Places, Without the Hype",
    template: "%s | NoCapBLR",
  },
  description:
    "Discover places through people's real experiences. Explore honest opinions, find places worth visiting, and share your own take with NoCapBLR — India's next big review network.",
  applicationName: "NoCapBLR",
  authors: [{ name: "NoCapBLR Community", url: "https://www.nocapblr.com" }],
  creator: "NoCapBLR",
  publisher: "NoCapBLR",
  formatDetection: {
    email: false,
    address: true,
    telephone: false,
  },
  alternates: {
    canonical: "https://www.nocapblr.com",
  },
  openGraph: {
    title: "NoCapBLR — Real Reviews of Places, Without the Hype",
    description:
      "Skip the influencer hype. Real people, real opinions, right where they happened. Bengaluru's local scene completely uncapped.",
    url: "https://www.nocapblr.com",
    siteName: "NoCapBLR",
    images: [
      {
        url: "/nocap-logo.png",
        width: 1200,
        height: 630,
        alt: "NoCapBLR — Real Opinions on Real Places",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NoCapBLR — Real Reviews of Places, Without the Hype",
    description:
      "Before you go, know. Unfiltered community opinions and location-verified reviews across Bengaluru.",
    images: ["/nocap-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.nocapblr.com/#organization",
      name: "NoCapBLR",
      url: "https://www.nocapblr.com",
      logo: "https://www.nocapblr.com/nocap-logo.png",
      sameAs: [
        "https://twitter.com/nocapblr",
        "https://instagram.com/nocapblr",
      ],
      description:
        "India's next big review network. Authentic, location-verified community opinions on places without promotional hype.",
    },
    {
      "@type": "WebSite",
      "@id": "https://www.nocapblr.com/#website",
      url: "https://www.nocapblr.com",
      name: "NoCapBLR",
      publisher: {
        "@id": "https://www.nocapblr.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.nocapblr.com/map?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-[#F6F5F2]`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body suppressHydrationWarning className="h-full min-h-screen flex flex-col bg-[#F6F5F2] text-[#18181B]">
        <GoogleAnalytics />
        <HemloNav />
        {children}
      </body>
    </html>
  );
}
