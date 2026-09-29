import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  MapPin,
  Navigation,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getJobById } from "@/lib/services/jobs";
import type { NormalizedJob } from "@/lib/types";
import { displayField, toTitleCase } from "@/lib/utils/strings";

export const dynamic = "force-dynamic";

type JobPageProps = {
  params: Promise<{ id: string }>;
};

function distanceLabel(job: NormalizedJob): string {
  if (job.workMode === "remote") return "Remote";
  if (typeof job.distanceKm === "number") {
    return `${job.distanceKm.toFixed(job.distanceKm < 10 ? 1 : 0)} km from center`;
  }
  return "Bengaluru";
}

function salaryLabel(job: NormalizedJob): string {
  if (!job.salary.min && !job.salary.max) return "Competitive / Undisclosed";
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: job.salary.currency ?? "INR",
    maximumFractionDigits: 0,
  });
  if (job.salary.min && job.salary.max) return `${fmt.format(job.salary.min)} – ${fmt.format(job.salary.max)}`;
  return `${fmt.format(job.salary.min ?? job.salary.max ?? 0)}+`;
}

function postedLabel(p?: string | null): string {
  if (!p) return "Recently listed";
  const d = Math.floor((Date.now() - new Date(p).getTime()) / 86400000);
  if (!Number.isFinite(d)) return "Recently listed";
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return (
      <main className="min-h-screen bg-[#F7F8FB] px-4 py-12 text-zinc-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-2xs">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Opportunity not found</h1>
          <p className="mt-2 text-xs text-zinc-500">
            This opening may have closed or moved. Return to the discovery map to find live opportunities.
          </p>
          <div className="mt-6">
            <Button asChild variant="primary" size="md">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Return to map
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const reviewSlug = job.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <main className="min-h-screen bg-[#F7F8FB] px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="secondary" size="sm" className="shadow-2xs">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to opportunities</span>
            </Link>
          </Button>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md ring-1 ring-inset ring-emerald-600/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Listing
          </span>
        </div>

        {/* Main Card */}
        <article className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xs">
          {/* Header */}
          <header className="border-b border-zinc-100 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-500 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-zinc-400" />
                    {job.companyName}
                  </span>
                  {job.workMode === "remote" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                      <Wifi className="h-2.5 w-2.5" /> Remote
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                  {job.title}
                </h1>
                <p className="mt-2 text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {job.locationText}
                </p>
              </div>

              <div className="shrink-0">
                <Button asChild variant="primary" size="lg" className="w-full sm:w-auto shadow-sm">
                  <a href={job.applyUrl} target="_blank" rel="noreferrer">
                    Apply directly
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              <Badge tone={job.employmentType === "internship" ? "green" : "purple"}>
                {job.employmentType === "full_time" ? "Full-time" : toTitleCase(job.employmentType)}
              </Badge>
              <Badge tone="blue">{displayField(job.field)}</Badge>
              <Badge tone="gray">{toTitleCase(job.workMode)}</Badge>
              {job.studentRelevant && <Badge tone="green">Student-friendly</Badge>}
              {job.startup?.isStartup && <Badge tone="purple">Startup</Badge>}
            </div>
          </header>

          {/* Metric Tiles */}
          <section className="grid grid-cols-2 gap-3 border-b border-zinc-100 bg-zinc-50/50 p-6 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <IndianRupee className="h-3 w-3" /> Compensation
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-900 truncate">{salaryLabel(job)}</p>
            </div>

            <div className="rounded-xl border border-zinc-200/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Navigation className="h-3 w-3" /> Location
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-900 truncate">{distanceLabel(job)}</p>
            </div>

            <div className="rounded-xl border border-zinc-200/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Posted
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-900 truncate">{postedLabel(job.postedAt)}</p>
            </div>

            <div className="rounded-xl border border-zinc-200/70 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verification
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">Official Portal</p>
            </div>
          </section>

          {/* Details & Description */}
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_260px]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Role &amp; Team Details
              </h2>
              <div className="mt-4 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-zinc-700 font-normal">
                {job.description || "Refer to the official portal for comprehensive responsibility details and requirements."}
              </div>

              {job.skills && job.skills.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Required Skills &amp; Stack
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200/60"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar info */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Company Insight</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  {job.companyName} is hiring in Bengaluru. Applications submit directly to their primary career page.
                </p>

                <div className="mt-4 space-y-2 pt-3 border-t border-zinc-200/60">
                  <a
                    href={`https://www.ambitionbox.com/overview/${reviewSlug}-overview`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors py-1"
                  >
                    <span>AmbitionBox Reviews</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>

                  {job.company?.website && (
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors py-1"
                    >
                      <span>Company Website</span>
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Verified Direct Opening
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-700/90">
                  This opportunity was matched and verified against official company career endpoints.
                </p>
              </div>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}