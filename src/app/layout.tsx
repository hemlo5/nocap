import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainNav } from "@/components/nav/main-nav";
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
  title: "NearHire - Jobs, Startups & Market Insights",
  description: "Discover opportunities near you, follow Bengaluru startups, and explore real market problems.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-[#F7F8FB]`}
    >
      <body suppressHydrationWarning className="h-full min-h-screen flex flex-col bg-[#F7F8FB] text-[#111827]">
        <MainNav />
        {children}
      </body>
    </html>
  );
}