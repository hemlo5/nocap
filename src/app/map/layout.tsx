import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map | NoCap Bengaluru",
  description: "A map of Bengaluru places with location-bound community reviews. Real people, real places, right where they experienced them.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}

