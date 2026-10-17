"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LandingGate() {
  const router = useRouter();

  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      if (search.get("landing") === "1") {
        return;
      }

      const hasSeen = localStorage.getItem("nocap_seen_landing");
      if (hasSeen === "true") {
        router.replace("/map");
      } else {
        localStorage.setItem("nocap_seen_landing", "true");
      }
    } catch {
      // Storage unavailable or disabled in private mode
    }
  }, [router]);

  return null;
}

