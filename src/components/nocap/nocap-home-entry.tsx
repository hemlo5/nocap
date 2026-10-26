"use client";

import { useRouter } from "next/navigation";
import { NocapLanding } from "@/components/nocap/nocap-landing";

export function NocapHomeEntry() {
  const router = useRouter();
  return <NocapLanding onEnter={() => router.push("/map?enter=1")} />;
}
