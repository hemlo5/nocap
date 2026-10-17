import type { Metadata } from "next";
import { HemloApp } from "@/components/hemlo-app";

export const metadata: Metadata = {
  title: "Opportunities | Hemlo",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OpportunitiesPage() {
  return <HemloApp />;
}

