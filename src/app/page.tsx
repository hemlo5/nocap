import type { Metadata } from "next";
import { NocapHomeEntry } from "@/components/nocap/nocap-home-entry";

export const metadata: Metadata = {
  title: "NoCapBLR | Real Reviews, Real Places",
  description: "Explore Bengaluru through candid local context and location-aware reviews.",
  alternates: { canonical: "https://nocapblr.com" },
};

export default function Home() {
  return <NocapHomeEntry />;
}
