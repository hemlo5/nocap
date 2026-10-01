"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  ArrowUpRight, Building2, CalendarClock, CheckCircle2,
  ExternalLink, GraduationCap, IndianRupee, MapPin,
  Navigation, Rocket, TrendingUp, Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NormalizedJob } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { displayField, toTitleCase } from "@/lib/utils/strings";

// ─── ATS roots to skip for logo domain extraction ────────────────────────────
const ATS_ROOTS = new Set([
  "greenhouse.io","lever.co","workday.com","myworkdayjobs.com","icims.com",
  "taleo.net","bamboohr.com","smartrecruiters.com","linkedin.com","indeed.com",
  "naukri.com","wellfound.com","angellist.com","instahyre.com","hirist.tech",
  "internshala.com","glassdoor.com","monster.com","shine.com","recruitcrm.io",
  "ashbyhq.com","rippling.com","jobvite.com","workable.com",
]);
const GENERIC_SUB = new Set(["jobs","careers","apply","work","hire","talent","recruiting"]);

function getLogoUrls(job: NormalizedJob): string[] {
  const urls: string[] = [];
  if (job.company?.logoUrl) urls.push(job.company.logoUrl);
  const seen = new Set<string>();
  const tryUrl = (src: string | null | undefined) => {
    if (!src) return;
    try {
      const hostname = new URL(src).hostname.replace(/^www\./,"");
      const root = hostname.split(".").slice(-2).join(".");
      if (ATS_ROOTS.has(root)) {
        const parts = hostname.split(".");
        if (parts.length >= 3 && !GENERIC_SUB.has(parts[0])) {
          const g = `${parts[0]}.com`;
          if (!seen.has(g)) { seen.add(g); urls.push(`https://www.google.com/s2/favicons?sz=128&domain=${g}`); }
        }
      } else {
        if (!seen.has(root)) { seen.add(root); urls.push(`https://www.google.com/s2/favicons?sz=128&domain=${root}`); }
      }
    } catch { /* skip */ }
  };
  tryUrl(job.company?.website); tryUrl(job.applyUrl); tryUrl(job.sourceUrl);
  return urls;
}

// ─── Brand color ─────────────────────────────────────────────────────────────
type RGB = { r: number; g: number; b: number };

function hashBrandColor(name: string): RGB {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  return hslToRgb(Math.abs(h) % 360, 65, 42);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round((l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)))) * 255);
  return { r: f(0), g: f(8), b: f(4) };
}

function clamp(v: number) { return Math.max(0, Math.min(255, v)); }
function lighten(c: RGB, a: number): RGB { return { r: clamp(c.r+a), g: clamp(c.g+a), b: clamp(c.b+a) }; }
function darken(c: RGB, a: number): RGB  { return { r: clamp(c.r-a), g: clamp(c.g-a), b: clamp(c.b-a) }; }
function toRgb(c: RGB) { return `${c.r},${c.g},${c.b}`; }

const brandColorCache = new Map<string, RGB>();

function useBrandColor(logoUrls: string[], companyName: string): RGB {
  const cached = brandColorCache.get(companyName);
  const [color, setColor] = useState<RGB>(() => cached ?? hashBrandColor(companyName));
  useEffect(() => {
    if (cached) return;
    const url = logoUrls.find(u => u.includes("google.com/s2/favicons"));
    if (!url) { brandColorCache.set(companyName, color); return; }
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const sz = 48; const canvas = document.createElement("canvas"); canvas.width = sz; canvas.height = sz;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        ctx.drawImage(img, 0, 0, sz, sz);
        const { data } = ctx.getImageData(0, 0, sz, sz);
        const freq = new Map<string, { n:number; r:number; g:number; b:number }>();
        for (let i = 0; i < data.length; i += 4) {
          const [r,g,b,a] = [data[i],data[i+1],data[i+2],data[i+3]];
          if (a < 80 || (r>230 && g>230 && b>230) || (r<25 && g<25 && b<25)) continue;
          const k = `${r>>4}:${g>>4}:${b>>4}`;
          const e = freq.get(k);
          if (e) { e.n++; e.r+=r; e.g+=g; e.b+=b; } else freq.set(k,{n:1,r,g,b});
        }
        if (!freq.size) return;
        const top = [...freq.values()].sort((a,b)=>b.n-a.n)[0];
        setColor({ r:top.r/top.n|0, g:top.g/top.n|0, b:top.b/top.n|0 });
      } catch { /* CORS blocked */ }
    };
    img.onerror = () => { brandColorCache.set(companyName, color); };
    img.src = url;
  }, [logoUrls, cached, companyName, color]);
  return color;
}

// ─── Logo with fallback chain ─────────────────────────────────────────────────
function CompanyLogo({ urls, companyName, forCard = false }: {
  urls: string[]; companyName: string; forCard?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const initials = companyName.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()??"").join("");
  const current = urls[idx];
  const base = forCard
    ? "h-14 w-14 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-zinc-100 shrink-0"
    : "h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-200/80 bg-zinc-50 shrink-0";

  return (
    <div className={base}>
      {current && idx < urls.length ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt={`${companyName} logo`}
          className={forCard ? "h-10 w-10 object-contain" : "h-7 w-7 object-contain"}
          onError={() => { if (idx+1 < urls.length) setIdx(idx+1); else setIdx(urls.length); }}
        />
      ) : (
        <span className={cn("font-bold select-none", forCard ? "text-base text-zinc-800" : "text-xs text-zinc-700")}>
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export type JobCardProps = {
  job: NormalizedJob;
  selected: boolean;
  onSelect: (job: NormalizedJob) => void;
  expanded?: boolean;
};

export const JobCard = React.memo(function JobCard({ job, selected, onSelect, expanded = false }: JobCardProps) {
  const logoUrls = getLogoUrls(job);
  const color    = useBrandColor(logoUrls, job.companyName);

  const light = lighten(color, 70);
  const mid   = lighten(color, 20);
  const dark  = darken(color, 50);
  const rgb   = toRgb(color);
  const brand = `rgb(${rgb})`;

  // ── EXPANDED: full view (map hidden) ──────────────────────────────────────
  if (expanded) {
    const gradient = `linear-gradient(135deg, rgb(${toRgb(light)}) 0%, rgb(${toRgb(mid)}) 45%, rgb(${toRgb(dark)}) 100%)`;
    const salary   = salaryLabel(job);
    const distance = distanceLabel(job);
    const excerpt  = descriptionExcerpt(job.description);
    const topSkills = (job.skills ?? []).slice(0, 5);

    return (
      <article
        id={`job-card-${cssSafeId(job.id)}`}
        className="rounded-2xl overflow-hidden relative transition-all duration-200"
        style={{
          background: gradient,
          boxShadow: selected
            ? `0 0 0 3px rgba(${rgb},0.5), 0 12px 40px rgba(${toRgb(dark)},0.45)`
            : `0 8px 32px rgba(${toRgb(dark)},0.35)`,
          transform: selected ? "scale(1.01)" : "scale(1)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 65%)" }}
        />

        <div className="relative p-5">
          <button type="button" onClick={() => onSelect(job)} className="block w-full text-left focus-visible:outline-none">
            {/* Header: logo + title */}
            <div className="flex items-start gap-4">
              <CompanyLogo urls={logoUrls} companyName={job.companyName} forCard />
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-xl font-bold leading-6 text-white drop-shadow-sm line-clamp-2">
                  {job.title}
                </h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-white/85">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-white/70" />
                  {job.companyName}
                </p>
              </div>
              <Badge tone={job.employmentType === "internship" ? "green" : "purple"} className="shrink-0 mt-0.5">
                {job.employmentType === "full_time" ? "Full-time" : toTitleCase(job.employmentType)}
              </Badge>
            </div>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.workMode === "remote" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <Wifi className="h-3 w-3" /> Remote
                </span>
              )}
              {job.workMode === "hybrid" && (
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">Hybrid</span>
              )}
              {job.startup?.isStartup && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <Rocket className="h-3 w-3" />{job.startup.stage ? stageLabel(job.startup.stage) : "Startup"}
                </span>
              )}
              {job.studentRelevant && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <GraduationCap className="h-3 w-3" /> Student-friendly
                </span>
              )}
              {job.startupRoleType && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">{startupRoleLabel(job.startupRoleType)}</span>
              )}
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">{displayField(job.field)}</span>
            </div>

            {/* Role overview */}
            {excerpt && (
              <div className="mt-3 rounded-xl bg-black/20 p-3 backdrop-blur-sm">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/70">Role overview</p>
                <p className="text-sm leading-5 text-white/90 line-clamp-2">{excerpt}</p>
              </div>
            )}

            {/* Skills */}
            {topSkills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {topSkills.map(s => (
                  <span key={s} className="rounded-md bg-black/25 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">{s}</span>
                ))}
              </div>
            )}

            {/* Metrics */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/25 p-3 backdrop-blur-sm">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" /> Pay
                </p>
                <p className={cn("text-sm font-bold text-white truncate", salary === "Not disclosed" && "opacity-60")}>{salary}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3 backdrop-blur-sm">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> Distance
                </p>
                <p className="text-sm font-bold text-white">{distance}</p>
              </div>
            </div>

            {/* Location */}
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-white/80 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-white/60" />{job.locationText}
            </p>

            {/* Growth signal */}
            {job.startup?.isStartup && job.startup.stage && (
              <div className="mt-3 rounded-xl bg-black/20 p-3 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 text-white/70">
                  <TrendingUp className="h-3 w-3" /> Growth signal
                </p>
                <p className="text-xs text-white/90">{stageRoiNote(job.startup.stage)}</p>
              </div>
            )}

            {/* Verification status */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {job.verificationStatus === "RECENTLY_VERIFIED" ? "Recently verified" : "Verified"}
              </span>
              <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{postedLabel(job.postedAt)}</span>
              {job.sourceKind === "official_ats" && <span className="font-semibold text-white/90">Direct Opening</span>}
            </div>
          </button>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <Button asChild size="sm" className="bg-white text-zinc-900 hover:bg-white/90 font-bold border-0 shadow-sm">
              <a href={job.applyUrl} target="_blank" rel="noreferrer">Apply <ArrowUpRight className="h-3.5 w-3.5" /></a>
            </Button>
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0 font-semibold backdrop-blur-sm" type="button" onClick={() => onSelect(job)}>
              Details
            </Button>
            <Button asChild size="sm" variant="ghost" className="ml-auto text-white/80 hover:text-white text-xs">
              <a href={`https://www.ambitionbox.com/overview/${job.companyName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-overview`} target="_blank" rel="noreferrer">
                Reviews <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  // ── COMPACT: map visible (Vercel / Linear clean card standard) ────────────
  const salary  = salaryLabel(job);
  const distance = distanceLabel(job);

  return (
    <article
      id={`job-card-${cssSafeId(job.id)}`}
      className={cn(
        "group relative rounded-xl border bg-white shadow-whisper shadow-whisper-hover transition-all duration-150 ease-out hover:border-zinc-300",
        selected
          ? "border-zinc-900 ring-2 ring-zinc-900/10"
          : "border-zinc-200/80",
      )}
    >
      <div className="flex">
        {/* Subtle indicator bar */}
        <div
          className={cn(
            "w-1 shrink-0 rounded-l-xl transition-colors",
            selected ? "bg-[#18181B]" : "bg-transparent group-hover:bg-zinc-300",
          )}
        />
        <div className="flex-1 min-w-0 p-3.5">
          <button type="button" onClick={() => onSelect(job)} className="block w-full text-left focus-visible:outline-none">
            <div className="flex items-start gap-3">
              <CompanyLogo urls={logoUrls} companyName={job.companyName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold leading-snug text-zinc-900 line-clamp-2 group-hover:text-[#18181B] transition-colors">
                    {job.title}
                  </h3>
                  <Badge tone={job.employmentType === "internship" ? "green" : "purple"} className="shrink-0 text-[10px]">
                    {job.employmentType === "full_time" ? "Full-time" : toTitleCase(job.employmentType)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs font-medium text-[#71717A] truncate">{job.companyName}</p>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-2.5 flex flex-wrap gap-1">
              {job.workMode === "remote" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200/70">
                  <Wifi className="h-2.5 w-2.5" /> Remote
                </span>
              )}
              {job.workMode === "hybrid" && (
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">
                  Hybrid
                </span>
              )}
              {job.startup?.isStartup && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white ring-0">
                  <Rocket className="h-2.5 w-2.5" />
                  {job.startup.stage ? stageLabel(job.startup.stage) : "Startup"}
                </span>
              )}
              {job.studentRelevant && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <GraduationCap className="h-2.5 w-2.5" /> Student
                </span>
              )}
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200/70">
                {displayField(job.field)}
              </span>
            </div>

            {/* Metrics */}
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-50 border border-zinc-100/80 p-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] font-mono">Pay</p>
                <p className={cn("text-xs font-semibold truncate mt-0.5", salary === "Not disclosed" ? "text-[#94A3B8] font-normal italic" : "text-[#18181B]")}>
                  {salary}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 border border-zinc-100/80 p-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] font-mono">Distance</p>
                <p className="text-xs font-semibold text-zinc-900 mt-0.5">{distance}</p>
              </div>
            </div>

            {/* Location & verification */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#71717A]">
              <span className="flex items-center gap-1 truncate max-w-[65%]">
                <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
                <span className="truncate">{job.locationText}</span>
              </span>
              <span className="flex items-center gap-1 shrink-0 font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Verified</span>
              </span>
            </div>
          </button>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-100">
            <Button asChild size="sm" variant="primary" className="h-7 px-3 text-xs font-semibold">
              <a href={job.applyUrl} target="_blank" rel="noreferrer">
                Apply <ArrowUpRight className="h-3 w-3" />
              </a>
            </Button>
            <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs font-medium" type="button" onClick={() => onSelect(job)}>
              Details
            </Button>
            {job.postedAt && (
              <span className="ml-auto text-[10px] text-[#71717A] font-medium">
                {postedLabel(job.postedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function cssSafeId(id: string): string { return id.replace(/[^a-zA-Z0-9_-]/g,"-"); }

function descriptionExcerpt(d?: string|null): string {
  if (!d) return "";
  const p = d.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  return p.length>220?p.slice(0,220)+"…":p;
}

function distanceLabel(job: NormalizedJob): string {
  if (job.workMode==="remote") return "Remote";
  if (typeof job.distanceKm==="number") return `${job.distanceKm.toFixed(job.distanceKm<10?1:0)} km`;
  return "—";
}

function salaryLabel(job: NormalizedJob): string {
  if (!job.salary.min&&!job.salary.max) return "Not disclosed";
  const fmt=new Intl.NumberFormat("en-IN",{style:"currency",currency:job.salary.currency??"INR",maximumFractionDigits:0});
  if (job.salary.min&&job.salary.max) return `${fmt.format(job.salary.min)}–${fmt.format(job.salary.max)}`;
  return `${fmt.format(job.salary.min??job.salary.max??0)}+`;
}

function postedLabel(p?:string|null):string {
  if (!p) return "Unknown";
  const d=Math.floor((Date.now()-new Date(p).getTime())/86400000);
  if (!Number.isFinite(d)) return "Unknown";
  if (d<=0) return "Today"; if (d===1) return "1d ago"; return `${d}d ago`;
}

function stageLabel(s:string):string {
  return ({pre_seed:"Pre-seed",seed:"Seed",series_a:"Series A",series_b:"Series B",series_c:"Series C",growth:"Growth",public:"Public"} as Record<string,string>)[s]??toTitleCase(s);
}

function stageRoiNote(s:string):string {
  return ({
    pre_seed:"Early-stage — high equity upside, fast learning.",
    seed:"Seed-stage — meaningful equity, shape the roadmap.",
    series_a:"Series A — PMF found, team scaling fast.",
    series_b:"Series B — strong ops scale, solid comp + equity.",
    series_c:"Series C — mature startup, near-IPO trajectory.",
    growth:"Growth stage — pre-IPO comp with real upside.",
    public:"Listed company — stable comp, ESOP liquidity.",
  } as Record<string,string>)[s]??"Startup role — equity & growth opportunity.";
}

function startupRoleLabel(r:NonNullable<NormalizedJob["startupRoleType"]>):string {
  return ({engineering:"Engineering",product:"Product",founder_office:"Founder's office",growth:"Growth",sales:"Sales",marketing:"Marketing",operations:"Ops",design:"Design",finance:"Finance",research:"Research",other:"Other"} as Record<string,string>)[r];
}