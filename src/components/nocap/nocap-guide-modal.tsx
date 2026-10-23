"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  LocateFixed,
  MapPin,
  Pencil,
  Pin,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function NocapGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  // Animation states for each slide
  const [slide1Phase, setSlide1Phase] = useState<"floating" | "clicking" | "opened">("floating");
  const [slide2Text, setSlide2Text] = useState("");
  const [slide2Rating, setSlide2Rating] = useState(0);
  const [slide2LocState, setSlide2LocState] = useState<"checking" | "verified" | "published">("checking");
  const [slide3Phase, setSlide3Phase] = useState<"idle" | "pinMode" | "dropped" | "form" | "saved">("idle");
  const [slide3Name, setSlide3Name] = useState("");

  // Slide 1 animation loop
  useEffect(() => {
    if (!isOpen || step !== 0) return;
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;

    const runLoop = () => {
      setSlide1Phase("floating");
      timer1 = setTimeout(() => {
        setSlide1Phase("clicking");
        timer2 = setTimeout(() => {
          setSlide1Phase("opened");
          timer3 = setTimeout(runLoop, 3200);
        }, 500);
      }, 1200);
    };

    runLoop();
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen, step]);

  // Slide 2 animation loop
  useEffect(() => {
    if (!isOpen || step !== 1) return;
    let cancelled = false;

    const fullReview = "Crispy benne dose is 100% legit! Piping hot filter coffee.";

    const runLoop = async () => {
      if (cancelled) return;
      setSlide2Text("");
      setSlide2Rating(0);
      setSlide2LocState("checking");

      // Wait 600ms then light up stars
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      setSlide2Rating(5);

      // Type text
      await new Promise((r) => setTimeout(r, 400));
      for (let i = 1; i <= fullReview.length; i += 2) {
        if (cancelled) return;
        setSlide2Text(fullReview.slice(0, i));
        await new Promise((r) => setTimeout(r, 45));
      }
      setSlide2Text(fullReview);

      // GPS Verified badge
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      setSlide2LocState("verified");

      // Click Publish
      await new Promise((r) => setTimeout(r, 900));
      if (cancelled) return;
      setSlide2LocState("published");

      // Wait and repeat
      await new Promise((r) => setTimeout(r, 2800));
      if (!cancelled) runLoop();
    };

    runLoop();
    return () => {
      cancelled = true;
    };
  }, [isOpen, step]);

  // Slide 3 animation loop
  useEffect(() => {
    if (!isOpen || step !== 2) return;
    let cancelled = false;

    const sampleName = "Third Wave Coffee, Church St";

    const runLoop = async () => {
      if (cancelled) return;
      setSlide3Phase("idle");
      setSlide3Name("");

      // Cursor moves to pin button
      await new Promise((r) => setTimeout(r, 900));
      if (cancelled) return;
      setSlide3Phase("pinMode");

      // Cursor taps map to drop pin
      await new Promise((r) => setTimeout(r, 1000));
      if (cancelled) return;
      setSlide3Phase("dropped");

      // Form opens
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      setSlide3Phase("form");

      // Type place name
      await new Promise((r) => setTimeout(r, 400));
      for (let i = 1; i <= sampleName.length; i += 2) {
        if (cancelled) return;
        setSlide3Name(sampleName.slice(0, i));
        await new Promise((r) => setTimeout(r, 40));
      }
      setSlide3Name(sampleName);

      // Click submit
      await new Promise((r) => setTimeout(r, 800));
      if (cancelled) return;
      setSlide3Phase("saved");

      // Wait and repeat
      await new Promise((r) => setTimeout(r, 2800));
      if (!cancelled) runLoop();
    };

    runLoop();
    return () => {
      cancelled = true;
    };
  }, [isOpen, step]);

  if (!isOpen) return null;

  function handleComplete() {
    try {
      localStorage.setItem("nocap_guide_seen", "true");
    } catch {}
    onClose();
  }

  const stepsData = [
    {
      badge: "Step 1 of 3 · EXPLORE",
      title: "Tap any dot on the map",
      desc: "Every dot represents a real Bengaluru hotspot. Click to view honest community takes, authentic ratings, and real wait times.",
    },
    {
      badge: "Step 2 of 3 · WRITE A NOCAP",
      title: "Drop your honest review",
      desc: "Tap any place across Bengaluru to share your honest take. Pick a star rating, type what it was really like, and publish.",
    },
    {
      badge: "Step 3 of 3 · ADD NEW SPOTS",
      title: "Pin a missing place within 1km",
      desc: "Found an underrated spot or cozy hangout? Tap 'Pin a place' to drop a new dot within 1km of your current location.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Dark backdrop */}
      <div
        onClick={handleComplete}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Main Dialog Modal */}
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 sm:px-6">
          {/* Actual NoCap Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/nocap-logo.png"
              alt="NoCap BLR"
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Guide
            </span>
          </div>

          {/* Step Pill Indicators */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step === i ? "w-6 bg-zinc-950" : "w-2 bg-zinc-200 hover:bg-zinc-300"
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Close / Skip button */}
          <button
            type="button"
            onClick={handleComplete}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
            title="Skip guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {/* Step Header */}
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-extrabold tracking-wider text-zinc-700">
              {stepsData[step].badge}
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-zinc-950">
              {stepsData[step].title}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm font-medium leading-relaxed text-zinc-500">
              {stepsData[step].desc}
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              ANIMATION STAGE
             ───────────────────────────────────────────────────────────── */}
          <div className="relative mx-auto h-[260px] sm:h-[280px] w-full overflow-hidden rounded-2xl border border-zinc-200/90 bg-[#F6F5F2] shadow-inner select-none">
            {/* ═════════════════════════════════════════════════════════
                STEP 1: CLICK A DOT & SEE REVIEWS
               ═════════════════════════════════════════════════════════ */}
            {step === 0 && (
              <div className="relative h-full w-full">
                {/* Stylized Map Grid Lines */}
                <svg className="absolute inset-0 h-full w-full opacity-35" viewBox="0 0 500 300">
                  <path d="M0,150 Q200,110 320,160 T500,140" fill="none" stroke="#cbd5e1" strokeWidth="8" />
                  <path d="M250,0 Q240,150 270,300" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                  <path d="M70,30 Q220,180 430,270" fill="none" stroke="#cbd5e1" strokeWidth="4" />
                  {/* Cubbon Park green zone */}
                  <rect x="290" y="40" width="70" height="50" rx="16" fill="#dcfce7" />
                  {/* Lalbagh green zone */}
                  <rect x="180" y="190" width="80" height="60" rx="20" fill="#dcfce7" />
                </svg>

                {/* Map Pins / Dots */}
                {/* Dot 1: CTR Malleshwaram */}
                <div className="absolute left-[20%] top-[25%] flex items-center gap-1.5 opacity-80 scale-90">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-md">
                    C
                  </div>
                  <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 shadow-xs">
                    CTR
                  </span>
                </div>

                {/* Dot 2: Church Street */}
                <div className="absolute left-[70%] top-[30%] flex items-center gap-1.5 opacity-80 scale-90">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-[10px] font-black text-white shadow-md">
                    S
                  </div>
                  <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 shadow-xs">
                    Church St
                  </span>
                </div>

                {/* Dot 3: TARGET DOT -> Vidyarthi Bhavan */}
                <div className="absolute left-[42%] top-[48%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                  {/* Pulse ring when clicked */}
                  {slide1Phase !== "floating" && (
                    <span className="absolute -inset-3 rounded-full bg-emerald-400/40 animate-ping" />
                  )}
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full font-black text-xs text-white shadow-lg transition-transform duration-300",
                      slide1Phase === "clicking"
                        ? "scale-125 bg-emerald-600 ring-4 ring-emerald-300"
                        : "bg-emerald-500"
                    )}
                  >
                    V
                  </div>
                  <span className="mt-1 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-black text-zinc-900 shadow-md border border-zinc-200">
                    Vidyarthi Bhavan 📍
                  </span>
                </div>

                {/* Animated Finger / Cursor */}
                <div
                  className={cn(
                    "pointer-events-none absolute z-30 transition-all duration-700 ease-out",
                    slide1Phase === "floating" && "left-[60%] top-[70%] opacity-100",
                    slide1Phase === "clicking" && "left-[43%] top-[49%] opacity-100 scale-90",
                    slide1Phase === "opened" && "left-[43%] top-[49%] opacity-0 scale-75"
                  )}
                >
                  <div className="relative">
                    <span className="text-2xl drop-shadow-lg">👆</span>
                  </div>
                </div>

                {/* Preview Sheet / Pop-up Card */}
                <div
                  className={cn(
                    "absolute bottom-2 left-3 right-3 z-20 rounded-2xl border border-zinc-200 bg-white/98 p-3.5 shadow-2xl backdrop-blur transition-all duration-500",
                    slide1Phase === "opened"
                      ? "translate-y-0 opacity-100 scale-100"
                      : "translate-y-16 opacity-0 scale-95 pointer-events-none"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-zinc-950">
                          Vidyarthi Bhavan
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-800">
                          100% Legit
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-500">
                        Basavanagudi · Gandhi Bazaar
                      </span>
                    </div>
                    <div className="rounded-lg bg-zinc-900 px-2.5 py-1 text-white text-[11px] font-black tracking-wide">
                      4.6 / 5
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] sm:text-xs text-zinc-700 font-medium line-clamp-2">
                    &ldquo;Benne masala is undeniably crisp with generous ghee. Real talk: skip Sunday morning peak without 35m wait.&rdquo;
                  </p>

                  <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-1.5 text-[10px] font-bold text-zinc-500">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified on-site
                    </span>
                    <span>3h ago · u/srinisreddit</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                STEP 2: HOW TO REVIEW (AT THE VENUE)
               ═════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="relative flex h-full w-full flex-col justify-between p-3.5 sm:p-4">
                {/* Header mimicking ReviewComposer */}
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-zinc-900">
                      Vidyarthi Bhavan
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold">· Reviewing</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                    Honest Review
                  </span>
                </div>

                {/* Rating Bar preview without star icons */}
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-zinc-950 px-2.5 py-1 text-[11px] font-black text-white">
                      Rating: 5.0
                    </span>
                    <span className="text-[11px] font-bold text-zinc-600">
                      Top Tier Spot
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">
                    Community Take
                  </span>
                </div>

                {/* Simulated Textarea */}
                <div className="relative mt-2 h-16 w-full rounded-xl border border-zinc-300 bg-white p-2.5 shadow-xs">
                  <p className="text-xs sm:text-sm font-medium text-zinc-900 leading-snug">
                    {slide2Text}
                    <span className="inline-block h-3.5 w-0.5 bg-zinc-950 animate-pulse ml-0.5 align-middle" />
                  </p>
                  {!slide2Text && (
                    <span className="text-xs text-zinc-400">
                      What was it actually like?
                    </span>
                  )}
                </div>

                {/* Location Status & Publish Button */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold">
                    {slide2LocState === "checking" && (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                        Verifying GPS location...
                      </span>
                    )}
                    {(slide2LocState === "verified" || slide2LocState === "published") && (
                      <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        GPS Verified at Gandhi Bazaar (±8m)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all shadow-md",
                      slide2LocState === "published"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-950 text-white"
                    )}
                  >
                    {slide2LocState === "published" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Published!
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Publish
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                STEP 3: HOW TO CREATE A DOT YOURSELF
               ═════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="relative h-full w-full">
                {/* Background map grid */}
                <svg className="absolute inset-0 h-full w-full opacity-35" viewBox="0 0 500 300">
                  <path d="M50,150 L450,150" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                  <path d="M250,50 L250,250" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                  <rect x="180" y="80" width="140" height="140" rx="20" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                </svg>

                {/* Pin mode top instruction pill */}
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-3 z-30 flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1 text-[11px] font-black text-white shadow-lg transition-all duration-300",
                    slide3Phase === "idle" ? "-translate-y-12 opacity-0" : "translate-y-0 opacity-100"
                  )}
                >
                  <Pin className="h-3.5 w-3.5 fill-white" />
                  <span>Tap within 1km of your location to pin a place</span>
                </div>

                {/* Floating "Pin a place" button (mimicking real UI) */}
                <div
                  className={cn(
                    "absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black shadow-lg transition-all",
                    slide3Phase !== "idle"
                      ? "bg-amber-500 text-white border-amber-600 scale-105 ring-2 ring-amber-300"
                      : "bg-white text-zinc-900 border-zinc-200"
                  )}
                >
                  <Pin className="h-3.5 w-3.5" />
                  <span>Pin Place</span>
                </div>

                {/* The Dropped Pin on map */}
                {(slide3Phase === "dropped" || slide3Phase === "form" || slide3Phase === "saved") && (
                  <div className="absolute left-[48%] top-[45%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center animate-in zoom-in-50 duration-300">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-white shadow-xl ring-4 ring-amber-200">
                      <Pin className="h-4 w-4 fill-white" />
                    </div>
                    {slide3Phase === "saved" && (
                      <span className="mt-1 rounded-md bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-white shadow-md">
                        {slide3Name || "New Place"} 📍
                      </span>
                    )}
                  </div>
                )}

                {/* The Mini PinPlaceForm Modal */}
                <div
                  className={cn(
                    "absolute inset-x-4 bottom-2 z-30 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xl transition-all duration-500",
                    slide3Phase === "form"
                      ? "translate-y-0 opacity-100 scale-100"
                      : "translate-y-16 opacity-0 scale-95 pointer-events-none",
                    slide3Phase === "saved" && "translate-y-16 opacity-0"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <span className="text-xs font-black text-zinc-900">
                      Pin a new place · 12.9758° N, 77.6012° E
                    </span>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      New Spot
                    </span>
                  </div>

                  <div className="mt-2 space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600">Place name</label>
                      <div className="h-7 w-full rounded border border-zinc-300 bg-zinc-50 px-2 flex items-center text-xs font-bold text-zinc-900">
                        {slide3Name}
                        <span className="inline-block h-3 w-0.5 bg-zinc-950 animate-pulse ml-0.5" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-zinc-600">Category</label>
                        <div className="h-7 rounded border border-zinc-200 bg-zinc-50 px-2 flex items-center text-[10px] font-bold text-zinc-700">
                          ☕ Food &amp; drink
                        </div>
                      </div>
                      <div className="flex items-end">
                        <div className="h-7 rounded bg-zinc-950 px-3 flex items-center gap-1 text-[11px] font-black text-white shadow-xs">
                          <Pin className="h-3 w-3" /> Pin spot
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success Banner when saved */}
                {slide3Phase === "saved" && (
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-30 rounded-2xl bg-zinc-950/95 p-3.5 text-center text-white shadow-2xl backdrop-blur animate-in zoom-in-75 duration-300">
                    <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400" />
                    <p className="mt-1 text-xs font-black">
                      Place pinned successfully!
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Now visible to everyone on NoCapBLR map.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5 sm:px-6">
          {/* Back button */}
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-700 px-2 py-1"
            >
              Skip
            </button>
          )}

          {/* Dots Indicator */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  step === i ? "w-6 bg-zinc-950" : "w-2 bg-zinc-300 hover:bg-zinc-400"
                )}
                aria-label={`Jump to page ${i + 1}`}
              />
            ))}
          </div>

          {/* Next / Get Started button */}
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-5 py-2 text-xs font-black text-white shadow-md transition-transform hover:bg-zinc-800 active:scale-95"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-2 text-xs font-black text-white shadow-md transition-transform hover:bg-emerald-500 active:scale-95"
            >
              Start Exploring <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

