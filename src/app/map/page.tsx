"use client";

import { useEffect, useState } from "react";
import { NocapApp } from "@/components/nocap/nocap-app";
import { NocapLanding } from "@/components/nocap/nocap-landing";

export default function MapPage() {
  const [entered, setEntered] = useState<boolean>(false);

  useEffect(() => {
    // If URL has direct parameters (like ?place=... or ?legit=...), skip landing directly into that place
    const params = new URLSearchParams(window.location.search);
    if (params.get("place") || params.get("legit")) {
      setEntered(true);
    }
  }, []);

  if (!entered) {
    return <NocapLanding onEnter={() => setEntered(true)} />;
  }

  return <NocapApp />;
}

