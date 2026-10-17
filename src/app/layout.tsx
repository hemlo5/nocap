import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HemloNav } from "@/components/nav/hemlo-nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "NoCap Bengaluru — Local place reviews",
  description: "A map of Bengaluru places with location-bound community reviews. Real people, real places, right where they experienced them.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-[#F9FAFB]`}
    >
      <body suppressHydrationWarning className="h-full min-h-screen flex flex-col bg-[#F9FAFB] text-[#18181B]">
        <HemloNav />
        {children}
      </body>
    </html>
  );
}
