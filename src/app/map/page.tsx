"use client";

import { useEffect, useState } from "react";
import { NocapApp } from "@/components/nocap/nocap-app";
import { NocapLanding } from "@/components/nocap/nocap-landing";

export default function MapPage() {
  // null = hydrating (don't render anything yet to avoid SSR mismatch)
  const [visited, setVisited] = useState<boolean | null>(null);

  useEffect(() => {
    setVisited(localStorage.getItem("nocap_visited") === "true");
  }, []);

  // Hydration guard — render nothing until we've read localStorage
  if (visited === null) return null;

  if (!visited) {
    return <NocapLanding onEnter={() => setVisited(true)} />;
  }

  return <NocapApp />;
}

