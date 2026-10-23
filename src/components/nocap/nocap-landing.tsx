"use client";

import { useEffect, useState } from "react";
import { CrowdCanvas } from "@/components/ui/skiper39";

const SPRITE_SHEET =
  "https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png";

interface NocapLandingProps {
  onEnter: () => void;
}

export function NocapLanding({ onEnter }: NocapLandingProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function handleEnter() {
    onEnter();
  }

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-[#F6F5F2]"
      style={{
        transition: "opacity 0.5s ease",
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Crowd canvas — mirrors the original Skiper39 demo layout exactly */}
      <div className="absolute bottom-0 h-full w-full">
        <CrowdCanvas src={SPRITE_SHEET} rows={15} cols={7} />
      </div>

      {/* Soft gradient so hero text is legible above the crowd */}
      <div
        className="absolute inset-x-0 top-0 h-[55%] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #F6F5F2 60%, transparent 100%)",
        }}
      />

      {/* Hero content — sits in the top half, above the crowd */}
      <div className="absolute inset-0 flex flex-col items-center justify-start z-10 pointer-events-none select-none px-6 pt-[12vh]">
        <img
          src="/nocap-logo.png"
          alt="NoCap BLR"
          className="h-20 sm:h-28 w-auto object-contain mb-5 drop-shadow-sm"
        />

        <p className="text-zinc-500 text-sm sm:text-base text-center max-w-xs leading-relaxed">
          Real reviews. Real places.{" "}
          <span className="text-zinc-950 font-medium">Right where they happened.</span>
        </p>

        <button
          onClick={handleEnter}
          className="pointer-events-auto mt-8 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-7 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 active:scale-95 transition-all duration-150"
        >
          Explore the Map
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>

        <p className="mt-4 text-xs text-zinc-400">
          Bengaluru&apos;s local scene, uncapped.
        </p>
      </div>
    </div>
  );
}
