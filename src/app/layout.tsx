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
  title: "Hemlo â Jobs & Startups in Bengaluru",
  description: "Find startup jobs, internships & tech roles on a live map of Bengaluru. 6,000+ opportunities from 150+ companies.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-[#F9FAFB]`}
    >
      <body suppressHydrationWarning className="h-full min-h-screen flex flex-col bg-[#F9FAFB] text-[#18181B]">
        <MainNav />
        {children}
      </body>
    </html>
  );
}