"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  IndianRupee,
  Layers,
  MapPin,
  Navigation,
  Rocket,
  Wifi,
  X,
  Briefcase,
  Tag,
  Clock,
} from "lucide-react";
import type { NormalizedJob } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { displayField, toTitleCase } from "@/lib/utils/strings";

const DepthCarousel = dynamic(() => import("@/components/ui/DepthCarousel"), {
  ssr: false,
});

const STAGE_LABEL: Record<string, string> = {
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
  public: "Public",
};

function getLogoUrls(job: NormalizedJob): string[] {
  const urls: string[] = [];
  if (job.company?.logoUrl) urls.push(job.company.logoUrl);
  try {
    const src = job.company?.website || job.applyUrl;
    if (src) {
      const root = new URL(src).hostname
        .replace(/^www\./, "")
        .split(".")
        .slice(-2)
        .join(".");
            urls.push(`https://www.google.com/s2/favicons?sz=128&domain=${root}`);
    }
  } catch {
    /* skip */
  }
  return urls;
}

function useLogo(urls: string[]) {
  const [idx, setIdx] = useState(0);
  const onError = () => {
    if (idx + 1 < urls.length) setIdx(idx + 1);
    else setIdx(urls.length);
  };
  return {
    url: idx < urls.length ? urls[idx] : null,
    onError,
  };
}

function formatSalary(job: NormalizedJob): string | null {
  if (!job.salary.min && !job.salary.max) return null;
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: job.salary.currency ?? "INR",
    maximumFractionDigits: 0,
  });
  if (job.salary.min && job.salary.max) {
    return `${fmt.format(job.salary.min)} – ${fmt.format(job.salary.max)}`;
  }
  return `${fmt.format(job.salary.min ?? job.salary.max ?? 0)}+`;
}

function postedAgo(job: NormalizedJob): string | null {
  if (!job.postedAt) return null;
  const days = Math.floor(
    (Date.now() - new Date(job.postedAt).getTime()) / 86400000,
  );
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function CardMiniRouteMap({
  job,
  userCoords,
}: {
  job: NormalizedJob;
  userCoords?: { lat: number; lng: number };
}) {
  const userLat = userCoords?.lat ?? 12.9716;
  const userLng = userCoords?.lng ?? 77.5946;
  const officeLat = job.latitude ?? userLat + 0.024;
  const officeLng = job.longitude ?? userLng + 0.032;

  const isRemote = job.workMode === "remote";
  const distanceKm =
    typeof job.distanceKm === "number"
      ? job.distanceKm
      : haversineDistance(userLat, userLng, officeLat, officeLng);

  const driveMins = Math.max(3, Math.round(distanceKm * 2.8));
  const transitMins = Math.max(6, Math.round(distanceKm * 4.2));
  const mapsDirUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${officeLat},${officeLng}`;

  if (isRemote) {
    return (
      <div className="relative w-full flex-1 min-h-[155px] sm:min-h-[185px] rounded-2xl overflow-hidden border border-black/[0.08] bg-[#f0f0e8] flex flex-col items-center justify-center p-4 sm:p-5 text-center select-none my-1">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12),transparent_70%)] pointer-events-none" />
        <div className="relative mb-2 flex items-center justify-center">
          <div className="absolute h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-blue-500/25 animate-ping" />
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-500 shadow-sm">
            <Globe className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xs sm:text-sm font-black text-zinc-900">100% Remote Position</p>
        <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5">Work from anywhere · Zero commute required</p>
        <div className="mt-2 sm:mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[9.5px] font-bold text-blue-700">
          <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Fully distributed worldwide
        </div>
      </div>
    );
  }

  const maxSpan = Math.max(
    Math.abs(userLat - officeLat),
    Math.abs(userLng - officeLng),
  );
  let zoom = 12;
  if (maxSpan < 0.02) zoom = 14;
  else if (maxSpan < 0.05) zoom = 13;
  else if (maxSpan < 0.12) zoom = 12;
  else zoom = 11;

  const project = (lat: number, lng: number, z: number) => {
    const siny = Math.min(
      Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
      0.9999,
    );
    return {
      x: 256 * (0.5 + lng / 360) * (1 << z),
      y:
        256 *
        (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) *
        (1 << z),
    };
  };

  const centerLat = (userLat + officeLat) / 2;
  const centerLng = (userLng + officeLng) / 2;

  const centerP = project(centerLat, centerLng, zoom);
  const userP = project(userLat, userLng, zoom);
  const officeP = project(officeLat, officeLng, zoom);

  const W = 380;
  const H = 210;

  const padX = 46;
  const padY = 36;
  const rawUx = W / 2 + (userP.x - centerP.x);
  const rawUy = H / 2 + (userP.y - centerP.y);
  const rawOx = W / 2 + (officeP.x - centerP.x);
  const rawOy = H / 2 + (officeP.y - centerP.y);

  let uX = Math.min(Math.max(rawUx, padX), W - padX);
  let uY = Math.min(Math.max(rawUy, padY), H - padY);
  let oX = Math.min(Math.max(rawOx, padX), W - padX);
  let oY = Math.min(Math.max(rawOy, padY), H - padY);

  if (Math.abs(uX - oX) < 45 && Math.abs(uY - oY) < 35) {
    uX -= 38;
    oX += 38;
    uY += 12;
    oY -= 12;
  }

  const tileX = Math.floor(centerP.x / 256);
  const tileY = Math.floor(centerP.y / 256);
  const tileOffsetX = centerP.x % 256;
  const tileOffsetY = centerP.y % 256;

  // 3x3 grid of tiles to cover entire expanded height seamlessly
  const tiles = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      tiles.push({
        x: tileX + dx,
        y: tileY + dy,
        left: W / 2 - tileOffsetX + dx * 256,
        top: H / 2 - tileOffsetY + dy * 256,
      });
    }
  }

  const dx = oX - uX;
  const dy = oY - uY;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / (distPx || 1);
  const ny = dx / (distPx || 1);
  const archHeight = Math.min(26, Math.max(12, distPx * 0.18));
  const midX = (uX + oX) / 2 + nx * archHeight;
  const midY = (uY + oY) / 2 + ny * archHeight;
  const pathD = `M ${uX} ${uY} Q ${midX} ${midY} ${oX} ${oY}`;

  const cleanLocation = (job.locationText || "Bengaluru").split(",")[0].trim();

  return (
    <div className="relative w-full flex-1 min-h-[155px] sm:min-h-[185px] rounded-2xl overflow-hidden border border-black/[0.08] bg-[#f0f0e8] shadow-inner select-none my-1">
      {/* Real OSM Map Tiles Background (Light Theme) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {tiles.map((t, idx) => (
          <img
            key={`${t.x}-${t.y}-${idx}`}
            src={`https://${["a", "b", "c"][idx % 3]}.tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
            alt=""
            className="absolute w-[256px] h-[256px] select-none pointer-events-none"
            style={{
              left: `${t.left}px`,
              top: `${t.top}px`,
              filter: "brightness(98%) saturate(90%) opacity(0.85)",
              maxWidth: "none",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ))}
        {/* Soft light vignettes to blend edges into card */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#f0f0e8]/90 via-transparent to-[#f0f0e8]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f0f0e8]/70 via-transparent to-[#f0f0e8]/70" />
      </div>

      {/* SVG Route Line, Traveling Pulse, and Pins */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          <linearGradient
            id={`grad-${job.id}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Glow halo under route */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#grad-${job.id})`}
          strokeWidth="4.5"
          strokeOpacity="0.2"
          strokeLinecap="round"
        />

        {/* Dashed route line */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#grad-${job.id})`}
          strokeWidth="2.5"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />

        {/* Traveling light particle */}
        <circle r="3.5" fill="#2563EB">
          <animateMotion path={pathD} dur="2.6s" repeatCount="indefinite" />
        </circle>

        {/* "You" Location Pin */}
        <g transform={`translate(${uX}, ${uY})`}>
          <circle r="9" fill="#3B82F6" fillOpacity="0.25" />
          <circle r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
          <rect
            x="-14"
            y="7.5"
            width="28"
            height="13"
            rx="3"
            fill="#FFFFFF"
            fillOpacity="0.94"
            stroke="#2563EB"
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="17"
            textAnchor="middle"
            fill="#1D4ED8"
            fontSize="7.5"
            fontWeight="bold"
          >
            YOU
          </text>
        </g>

        {/* "Office" Destination Pin */}
        <g transform={`translate(${oX}, ${oY})`}>
          <circle r="10" fill="#10B981" fillOpacity="0.25" />
          <circle r="5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
          <rect
            x="-22"
            y="7.5"
            width="44"
            height="13"
            rx="3"
            fill="#FFFFFF"
            fillOpacity="0.94"
            stroke="#059669"
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="17"
            textAnchor="middle"
            fill="#065F46"
            fontSize="7.5"
            fontWeight="bold"
          >
            OFFICE
          </text>
        </g>
      </svg>

      {/* Top Left: Neighborhood location badge */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg border border-black/10 bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-zinc-700 shadow-sm max-w-[180px] truncate">
        <MapPin className="h-3 w-3 text-red-500 shrink-0" />
        <span className="truncate">{cleanLocation}</span>
      </div>

      {/* Top Right: Commute distance & drive time */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
        <span>~{driveMins}m drive</span>
        <span className="text-emerald-400">·</span>
        <span>{distanceKm < 1 ? "< 1 km" : `${distanceKm.toFixed(1)} km`}</span>
      </div>

      {/* Bottom Left: Transit time */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg border border-black/10 bg-white/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-zinc-600 shadow-sm">
        <span>~{transitMins}m transit</span>
      </div>

      {/* Bottom Right: Quick Google Maps directions link */}
      <a
        href={mapsDirUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg border border-black/10 bg-white/90 hover:bg-white backdrop-blur-md px-2.5 py-1 text-[9.5px] font-bold text-zinc-700 hover:text-zinc-900 transition-colors shadow-sm"
        title="Get directions in Google Maps"
      >
        Directions <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

function CarouselCard({
  job,
  isActive,
  userCoords,
  onSelect,
  onViewDetails,
}: {
  job: NormalizedJob;
  isActive: boolean;
  userCoords?: { lat: number; lng: number };
  onSelect: () => void;
  onViewDetails?: () => void;
}) {
  const logoUrls = getLogoUrls(job);
  const logo = useLogo(logoUrls);
  const initials = job.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const salary = formatSalary(job);
  const posted = postedAgo(job);
  const dist =
    job.workMode === "remote"
      ? "Remote"
      : typeof job.distanceKm === "number"
        ? `${job.distanceKm.toFixed(job.distanceKm < 10 ? 1 : 0)} km`
        : null;
  const topSkills = (job.skills ?? []).slice(0, 4);

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden cursor-pointer select-none"
      style={{ background: "#0d0d0d", borderRadius: "inherit" }}
      onClick={onSelect}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "linear-gradient(180deg,rgba(255,255,255,0.055) 0%,transparent 100%)",
        }}
      />

      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow:
              "inset 0 0 0 1.5px rgba(255,255,255,0.22), 0 0 32px rgba(255,255,255,0.04)",
          }}
        />
      )}

      <div className="relative flex flex-col h-full px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-3 sm:pb-4 gap-2">
        {/* Header */}
        <div className="flex items-start gap-2.5 sm:gap-3.5 shrink-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md">
            {logo.url ? (
              <img
                src={logo.url}
                alt=""
                className="h-7 w-7 sm:h-9 sm:w-9 object-contain"
                onError={logo.onError}
              />
            ) : (
              <span className="text-xs sm:text-sm font-black text-black">
                {initials}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] sm:text-[16px] font-black leading-snug text-white line-clamp-1 tracking-tight">
              {job.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-white/50 truncate">
              <Building2 className="h-3 w-3 shrink-0" />
              {job.companyName}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/20 shrink-0 mt-0.5" />
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 shrink-0">
          {job.workMode === "remote" && (
            <Badge icon={<Wifi className="h-2.5 w-2.5" />}>Remote</Badge>
          )}
          {job.employmentType && (
            <Badge icon={<Briefcase className="h-2.5 w-2.5" />}>
              {job.employmentType === "full_time"
                ? "Full-time"
                : job.employmentType === "internship"
                  ? "Internship"
                  : toTitleCase(job.employmentType)}
            </Badge>
          )}
          {job.startup?.isStartup && (
            <Badge icon={<Rocket className="h-2.5 w-2.5" />}>
              {job.startup.stage
                ? (STAGE_LABEL[job.startup.stage] ??
                  toTitleCase(job.startup.stage))
                : "Startup"}
            </Badge>
          )}
          {job.studentRelevant && (
            <Badge icon={<GraduationCap className="h-2.5 w-2.5" />}>
              Student
            </Badge>
          )}
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white/40">
            {displayField(job.field)}
          </span>
        </div>

        {/* Route Map Preview showing distance from office to user location */}
        <CardMiniRouteMap job={job} userCoords={userCoords} />

        {/* Skills */}
        {topSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-1.5 shrink-0">
            {topSkills.map((s) => (
              <span
                key={s}
                className="rounded-md bg-white/[0.06] border border-white/[0.09] px-2 py-0.5 text-[9.5px] sm:text-[10px] font-medium text-white/50"
              >
                {s}
              </span>
            ))}
            {(job.skills?.length ?? 0) > 4 && (
              <span className="text-[9px] sm:text-[10px] text-white/25 self-center">
                +{(job.skills?.length ?? 0) - 4} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-auto shrink-0">
          <StatBox icon={<IndianRupee className="h-3 w-3" />} label="Salary">
            <span className={salary ? "text-white" : "text-white/20"}>
              {salary ?? "Not disclosed"}
            </span>
          </StatBox>
          <StatBox icon={<Navigation className="h-3 w-3" />} label="Distance">
            <span className="text-white">{dist ?? "—"}</span>
          </StatBox>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between shrink-0 pt-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-white/30">
            <span className="flex items-center gap-1 text-emerald-400/80 font-bold">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
            {posted && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-2.5 w-2.5" />
                  {posted}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onViewDetails && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="lg:hidden flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-white hover:bg-white/20 transition-colors"
              >
                View Details
              </button>
            )}
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-lg bg-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-black text-black hover:bg-white/90 transition-colors"
            >
              Apply <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5 text-[9.5px] font-semibold text-white/60">
      {icon}
      {children}
    </span>
  );
}

function StatBox({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2">
      <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">
        {icon}
        {label}
      </p>
      <div className="text-[12px] font-black">{children}</div>
    </div>
  );
}

// ─── Full detail panel ────────────────────────────────────────────────────────
function DetailPanel({
  job,
  onClose,
}: {
  job: NormalizedJob;
  onClose?: () => void;
}) {
  const logoUrls = getLogoUrls(job);
  const logo = useLogo(logoUrls);
  const initials = job.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const salary = formatSalary(job);
  const posted = postedAgo(job);
  const dist =
    job.workMode === "remote"
      ? "Remote"
      : typeof job.distanceKm === "number"
        ? `${job.distanceKm.toFixed(2)} km away`
        : null;
  const mapsUrl =
    job.latitude && job.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${job.latitude},${job.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.locationText + " Bengaluru")}`;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "#0b0c10" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10"
        style={{ background: "#0b0c10" }}
      >
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden rounded-lg px-2.5 py-1 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Back to cards"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Cards
            </button>
          )}
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest hidden lg:inline">
            Job Details
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 px-4 sm:px-6 py-4 sm:py-6">
        {/* Company + title */}
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg">
            {logo.url ? (
              <img
                src={logo.url}
                alt=""
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                onError={logo.onError}
              />
            ) : (
              <span className="text-base sm:text-xl font-black text-black">
                {initials}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight sm:leading-7">
              {job.title}
            </h2>
            <a
              href={job.company?.website ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/70 hover:text-white transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {job.companyName}
              {job.company?.website && (
                <ExternalLink className="h-3 w-3 text-white/40" />
              )}
            </a>
          </div>
        </div>

        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {salary && (
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                <IndianRupee className="h-3 w-3" />
                Salary
              </p>
              <p className="text-sm sm:text-base font-black text-white">{salary}</p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {job.salary.currency ?? "INR"} per year
              </p>
            </div>
          )}
          {dist && (
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                <Navigation className="h-3 w-3" />
                Distance
              </p>
              <p className="text-sm sm:text-base font-black text-white">{dist}</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-white/50 hover:text-white transition-colors mt-0.5 flex items-center gap-1"
              >
                <MapPin className="h-2.5 w-2.5" />
                Open in Maps
              </a>
            </div>
          )}
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
              <Briefcase className="h-3 w-3" />
              Type
            </p>
            <p className="text-sm sm:text-base font-black text-white">
              {job.employmentType === "full_time"
                ? "Full-time"
                : job.employmentType === "internship"
                  ? "Internship"
                  : toTitleCase(job.employmentType)}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {job.workMode === "remote"
                ? "Remote"
                : job.workMode === "hybrid"
                  ? "Hybrid"
                  : "On-site"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
              <Clock className="h-3 w-3" />
              Posted
            </p>
            <p className="text-sm sm:text-base font-black text-white">
              {posted ?? "Unknown"}
            </p>
            <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
              Verified listing
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl bg-white/[0.05] border border-white/10 px-3.5 sm:px-4 py-3 sm:py-3.5 flex items-center gap-2.5 sm:gap-3">
          <MapPin className="h-4 w-4 text-white/50 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              {job.locationText}
            </p>
            {job.city && (
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                {[job.city, job.state, job.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto shrink-0 rounded-lg border border-white/20 bg-white/5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            Map
          </a>
        </div>

        {/* Tags */}
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 sm:mb-3">
            <Tag className="h-3 w-3" />
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <span className="rounded-full border border-white/20 bg-white/[0.05] px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-white/80">
              {displayField(job.field)}
            </span>
            {job.sourceKind === "official_ats" && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-emerald-400">
                Direct Opening
              </span>
            )}
            {job.startup?.isStartup && (
              <span className="rounded-full border border-white/20 bg-white/[0.05] px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-white/80">
                <Rocket className="h-3 w-3 inline mr-1" />
                {job.startup.stage
                  ? (STAGE_LABEL[job.startup.stage] ??
                    toTitleCase(job.startup.stage))
                  : "Startup"}
              </span>
            )}
            {job.studentRelevant && (
              <span className="rounded-full border border-white/20 bg-white/[0.05] px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold text-white/80">
                <GraduationCap className="h-3 w-3 inline mr-1" />
                Student-friendly
              </span>
            )}
          </div>
        </div>

        {/* Skills */}
        {(job.skills?.length ?? 0) > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 sm:mb-3">
              <Tag className="h-3 w-3" />
              Required Skills
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {job.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-lg bg-white/[0.06] border border-white/15 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-white/90"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 sm:mb-3">
              <Briefcase className="h-3 w-3" />
              About the Role
            </p>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 sm:p-4">
              <p className="text-xs sm:text-[13px] leading-relaxed text-white/80 whitespace-pre-line">
                {job.description.slice(0, 1200)}
                {job.description.length > 1200 ? "…" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Company reviews */}
        <div className="rounded-2xl bg-white/[0.05] border border-white/10 px-3.5 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              {job.companyName} Reviews
            </p>
            <p className="text-[11px] sm:text-xs text-white/40 mt-0.5">
              Ratings on AmbitionBox
            </p>
          </div>
          <a
            href={`https://www.ambitionbox.com/overview/${job.companyName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}-overview`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            Reviews <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="sticky bottom-0 border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex gap-2.5 sm:gap-3"
        style={{ background: "#0b0c10" }}
      >
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 sm:py-3.5 text-sm sm:text-[15px] font-black text-black hover:bg-white/90 transition-colors shadow-lg"
        >
          Apply Now <ArrowUpRight className="h-4 w-4" />
        </a>
        <Link
          href={`/jobs/${encodeURIComponent(job.id)}`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-[13px] font-semibold text-white hover:bg-white/10 transition-colors"
        >
          Full Page
        </Link>
      </div>
    </div>
  );
}

export function JobDepthCarousel({
  jobs,
  selectedJobId,
  onSelectJob,
  userCoords,
  userLocationLabel,
}: {
  jobs: NormalizedJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  userCoords?: { lat: number; lng: number };
  userLocationLabel?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!selectedJobId || jobs.length === 0) return 0;
    const found = jobs.findIndex((j) => j.id === selectedJobId);
    return found !== -1 ? found : 0;
  });

  const [mobileTab, setMobileTab] = useState<"cards" | "details">("cards");

  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isDesktop = windowWidth >= 1024;

  const carouselConfig = useMemo(() => {
    if (windowWidth < 420) {
      return {
        cardWidth: Math.min(windowWidth - 36, 320),
        cardHeight: 460,
        spread: 65,
        depth: 65,
      };
    }
    if (windowWidth < 640) {
      return {
        cardWidth: Math.min(windowWidth - 48, 340),
        cardHeight: 480,
        spread: 85,
        depth: 80,
      };
    }
    if (windowWidth < 1024) {
      return {
        cardWidth: 380,
        cardHeight: 510,
        spread: 120,
        depth: 105,
      };
    }
    return {
      cardWidth: 420,
      cardHeight: 540,
      spread: 170,
      depth: 135,
    };
  }, [windowWidth]);

  useEffect(() => {
    if (!selectedJobId || jobs.length === 0) return;
    const found = jobs.findIndex((j) => j.id === selectedJobId);
    if (found !== -1 && found !== activeIndex) {
      setActiveIndex(found);
    }
  }, [selectedJobId, jobs, activeIndex]);

  const activeJob = jobs[activeIndex] ?? jobs[0] ?? null;

  const handleCardChange = useCallback(
    (idx: number) => {
      if (jobs.length === 0) return;
      const safeIdx = ((idx % jobs.length) + jobs.length) % jobs.length;
      setActiveIndex(safeIdx);
      const job = jobs[safeIdx];
      if (job) {
        onSelectJob(job.id);
      }
    },
    [jobs, onSelectJob],
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-white min-h-0 overflow-hidden">
      {/* Mobile Tab Switcher — only on mobile & tablet (< lg) */}
      <div className="lg:hidden flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 shrink-0">
        <div className="flex rounded-lg bg-zinc-200/80 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab("cards")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 transition-all",
              mobileTab === "cards"
                ? "bg-white text-zinc-900 shadow-xs font-bold"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Cards ({activeIndex + 1}/{jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("details")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 transition-all",
              mobileTab === "details"
                ? "bg-white text-zinc-900 shadow-xs font-bold"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </button>
        </div>
        {activeJob && (
          <span className="text-[11px] font-bold text-zinc-600 truncate max-w-[130px]">
            {activeJob.companyName}
          </span>
        )}
      </div>

      {/* Carousel Section */}
      <div
        className={cn(
          "w-full lg:w-[56%] transition-all duration-300 min-h-0",
          isDesktop
            ? "h-full block"
            : mobileTab === "cards"
              ? "flex-1 h-full block"
              : "hidden",
        )}
      >
        <DepthCarousel
          items={jobs.map((_, i) => ({ alt: `Job ${i + 1}` }))}
          renderCard={(i, isActive) => {
            const job = jobs[i];
            if (!job) return null;

            return (
              <CarouselCard
                job={job}
                isActive={isActive}
                userCoords={userCoords}
                onSelect={() => {
                  handleCardChange(i);
                  if (!isDesktop) {
                    setMobileTab("details");
                  }
                }}
                onViewDetails={() => {
                  handleCardChange(i);
                  setMobileTab("details");
                }}
              />
            );
          }}
          cardWidth={carouselConfig.cardWidth}
          cardHeight={carouselConfig.cardHeight}
          radius={24}
          depth={carouselConfig.depth}
          spread={carouselConfig.spread}
          tilt={10}
          tiltDirection="right"
          perspective={1500}
          visibleCards={1}
          falloff={0.12}
          blur={0}
          duration={600}
          ease="power2.out"
          autoplay={false}
          loop
          showControls
          showIndicators
          onChange={handleCardChange}
        />
      </div>

      {/* Detail Panel Section */}
      <div
        className={cn(
          "w-full lg:w-[44%] border-t lg:border-t-0 lg:border-l border-white/10 transition-all duration-300 min-h-0 overflow-hidden",
          isDesktop
            ? "h-full block"
            : mobileTab === "details"
              ? "flex-1 h-full block"
              : "hidden",
        )}
      >
        {activeJob ? (
          <DetailPanel
            job={activeJob}
            onClose={() => setMobileTab("cards")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400 bg-[#0b0c10]">
            Select a job to view details
          </div>
        )}
      </div>
    </div>
  );
}
