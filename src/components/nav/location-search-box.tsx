"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { LocationSearchResult } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export type LocationSearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (location: LocationSearchResult) => void;
  onSearchSubmit: (query?: string) => void;
  onUseMyLocation: () => void;
  isBusy: boolean;
};

const POPULAR_HUBS: Array<{
  name: string;
  sub: string;
  location: LocationSearchResult;
}> = [
  {
    name: "HSR Layout",
    sub: "Sector 1–7, Silk Board Hub",
    location: {
      label: "HSR Layout, Bengaluru, Karnataka, India",
      lat: 12.9121,
      lng: 77.6446,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Koramangala",
    sub: "Startup Hub, Sony Signal, 4th–7th Blk",
    location: {
      label: "Koramangala, Bengaluru, Karnataka, India",
      lat: 12.9352,
      lng: 77.6245,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Indiranagar",
    sub: "100ft Rd, 12th Main, CMH Road",
    location: {
      label: "Indiranagar, Bengaluru, Karnataka, India",
      lat: 12.9784,
      lng: 77.6408,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Bellandur / ORR",
    sub: "Ecospace, RMZ Ecoworld, TechVillage",
    location: {
      label: "Bellandur, Outer Ring Road, Bengaluru, Karnataka, India",
      lat: 12.9304,
      lng: 77.6784,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Whitefield",
    sub: "ITPL, EPIP Zone, Hoodi, Brookefield",
    location: {
      label: "Whitefield, Bengaluru, Karnataka, India",
      lat: 12.9698,
      lng: 77.75,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Manyata Tech Park",
    sub: "Hebbal, Nagavara, Thanisandra",
    location: {
      label:
        "Manyata Embassy Business Park, Nagavara, Bengaluru, Karnataka, India",
      lat: 13.0498,
      lng: 77.6205,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Electronic City",
    sub: "Phase 1 & 2, Infosys, Wipro, Hosa Rd",
    location: {
      label: "Electronic City, Bengaluru, Karnataka, India",
      lat: 12.8452,
      lng: 77.6602,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "BTM Layout",
    sub: "1st & 2nd Stage, Tavarekere, Madiwala",
    location: {
      label: "BTM Layout, Bengaluru, Karnataka, India",
      lat: 12.9166,
      lng: 77.6101,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Sarjapur Road",
    sub: "Carmelaram, Kasavanahalli, Doddakannelli",
    location: {
      label: "Sarjapur Road, Bengaluru, Karnataka, India",
      lat: 12.908,
      lng: 77.674,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Kothanur / Hennur",
    sub: "North Bengaluru, Hennur Main Rd",
    location: {
      label: "Kothanur, Hennur Main Road, Bengaluru, Karnataka 560077, India",
      lat: 13.0612,
      lng: 77.6521,
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
  },
];

function splitLabel(label: string) {
  const parts = label.split(",").map((s) => s.trim());
  const primary = parts[0] || label;
  const secondary = parts.slice(1).join(", ");
  return { primary, secondary };
}

export function LocationSearchBox({
  value,
  onChange,
  onSelectLocation,
  onSearchSubmit,
  onUseMyLocation,
  isBusy,
}: LocationSearchBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<LocationSearchResult[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live predictions fetch as user types (debounced 120ms)
  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPredictions([]);
      setIsLoadingPredictions(false);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoadingPredictions(true);
      try {
        const response = await fetch(
          `/api/locations/search?q=${encodeURIComponent(trimmed)}`,
        );
        if (!response.ok) {
          throw new Error("Prediction fetch failed");
        }
        const data = (await response.json()) as {
          results: LocationSearchResult[];
        };
        if (isMounted) {
          setPredictions(data.results || []);
          setActiveIndex(-1);
        }
      } catch {
        if (isMounted) {
          setPredictions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPredictions(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [value]);

  const handleSelect = useCallback(
    (loc: LocationSearchResult) => {
      onChange(loc.label);
      setIsOpen(false);
      setPredictions([]);
      onSelectLocation(loc);
    },
    [onChange, onSelectLocation],
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (activeIndex >= 0 && predictions[activeIndex]) {
        handleSelect(predictions[activeIndex]);
        return;
      }
      setIsOpen(false);
      onSearchSubmit(value);
    },
    [activeIndex, handleSelect, onSearchSubmit, predictions, value],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setIsOpen(true);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          predictions.length ? (prev + 1) % predictions.length : -1,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          predictions.length
            ? (prev - 1 + predictions.length) % predictions.length
            : -1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [handleSubmit, isOpen, predictions.length],
  );

  const handleClear = useCallback(() => {
    onChange("");
    setPredictions([]);
    setActiveIndex(-1);
    setIsOpen(true);
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1.5 w-full max-w-[210px] xs:max-w-[270px] sm:max-w-md ml-1 sm:ml-3 min-w-0"
    >
      {/* Search Input Container */}
      <form
        onSubmit={handleSubmit}
        className="relative flex-1 min-w-0 flex items-center"
      >
        <MapPin
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-600 shrink-0 z-10"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search area, tech park, PIN in Bengaluru..."
          autoComplete="off"
          spellCheck={false}
          style={{
            color: "#09090b",
            WebkitTextFillColor: "#09090b",
            backgroundColor: "#ffffff",
          }}
          className={cn(
            "h-8 w-full rounded-lg border border-zinc-200/90 pl-8 pr-7 text-xs font-semibold text-zinc-950",
            "shadow-xs outline-none transition-all duration-150",
            "placeholder:text-zinc-400 placeholder:font-normal",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
          )}
        />

        {/* Clear or loading indicator inside input */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-10">
          {isLoadingPredictions ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Search Button */}
      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={isBusy}
        className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 shadow-xs"
        title="Search location"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {isBusy ? "Locating..." : "Search"}
        </span>
      </button>

      {/* My Location Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          onUseMyLocation();
        }}
        disabled={isBusy}
        className="h-8 px-2 rounded-lg text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 shadow-xs"
        title="Use my location"
      >
        <LocateFixed className="h-3.5 w-3.5 text-blue-600" />
        <span className="hidden md:inline">My location</span>
      </button>

      {/* Google Maps-style Live Dropdown */}
      {isOpen && (
        <div
          style={{ filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.14))" }}
          className="absolute top-full left-0 mt-1.5 z-[9999] w-[320px] xs:w-[380px] sm:w-[440px] max-h-[460px] overflow-y-auto rounded-xl border border-zinc-200/90 bg-white divide-y divide-zinc-100"
        >
          {/* Live Predictions List */}
          {predictions.length > 0 && (
            <div className="py-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <Search className="h-3 w-3 text-zinc-400" />
                <span>Predicted Locations</span>
              </div>
              {predictions.map((pred, index) => {
                const { primary, secondary } = splitLabel(pred.label);
                const isSelected = activeIndex === index;
                return (
                  <button
                    key={`${pred.lat}-${pred.lng}-${index}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(pred);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer",
                      isSelected
                        ? "bg-blue-50/90 text-blue-950"
                        : "hover:bg-zinc-50/90 text-zinc-900",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-600",
                      )}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-900 truncate">
                        {primary}
                      </div>
                      {secondary && (
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {secondary}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Searching state */}
          {isLoadingPredictions && predictions.length === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-3.5 text-xs font-medium text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span>Predicting areas in Bengaluru...</span>
            </div>
          )}

          {/* No direct matches */}
          {!isLoadingPredictions &&
            predictions.length === 0 &&
            value.trim().length >= 2 && (
              <div className="px-4 py-3 text-xs text-zinc-500">
                <span>No exact neighborhood match for &ldquo;</span>
                <span className="font-semibold text-zinc-800">
                  {value.trim()}
                </span>
                <span>&rdquo;. Press Search or choose a tech hub below:</span>
              </div>
            )}

          {/* Popular Hubs Grid */}
          <div className="p-3 bg-zinc-50/70">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Popular Tech Hubs in Bengaluru</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_HUBS.map((hub) => (
                <button
                  key={hub.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(hub.location);
                  }}
                  className="text-left px-2.5 py-1.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-blue-50/80 hover:border-blue-200 transition-all group flex flex-col justify-center"
                >
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-zinc-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                    <span className="text-[11px] font-bold text-zinc-800 group-hover:text-blue-900 truncate">
                      {hub.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600 truncate mt-0.5 pl-4.5">
                    {hub.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
