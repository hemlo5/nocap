import type { NormalizedJob } from "@/lib/types";
import { normalizeKey } from "@/lib/utils/strings";

export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const byKey = new Map<string, NormalizedJob>();

  for (const job of jobs) {
    const key = [
      normalizeKey(job.companyName),
      job.normalizedTitle,
      normalizeKey(job.city ?? job.locationText),
    ].join("|");
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, withSourceProvenance(job));
      continue;
    }

    const mergedProvenance = mergeProvenance(existing, job);
    if (isBetterSource(job, existing)) {
      byKey.set(key, {
        ...withSourceProvenance(job),
        sourceProvenance: mergedProvenance,
      });
    } else {
      byKey.set(key, {
        ...existing,
        sourceProvenance: mergedProvenance,
      });
    }
  }

  return [...byKey.values()];
}

function withSourceProvenance(job: NormalizedJob): NormalizedJob {
  return {
    ...job,
    sourceProvenance: mergeProvenance(job),
  };
}

function mergeProvenance(
  ...jobs: Array<NormalizedJob | null | undefined>
): NonNullable<NormalizedJob["sourceProvenance"]> {
  const byKey = new Map<string, NonNullable<NormalizedJob["sourceProvenance"]>[number]>();

  for (const job of jobs) {
    if (!job) {
      continue;
    }

    const entries = job.sourceProvenance?.length
      ? job.sourceProvenance
      : [
          {
            source: job.source,
            sourceKey: job.sourceKey,
            sourceType: job.sourceType,
            sourceKind: job.sourceKind,
            sourceUrl: job.sourceUrl,
            applyUrl: job.applyUrl,
            sourceRank: job.sourceRank,
          },
        ];

    for (const entry of entries) {
      byKey.set(
        `${entry.source}:${entry.sourceKey}:${entry.applyUrl}`,
        entry,
      );
    }
  }

  return [...byKey.values()].sort((a, b) => b.sourceRank - a.sourceRank);
}

function isBetterSource(candidate: NormalizedJob, existing: NormalizedJob): boolean {
  if (candidate.sourceRank !== existing.sourceRank) {
    return candidate.sourceRank > existing.sourceRank;
  }

  const candidatePosted = candidate.postedAt
    ? new Date(candidate.postedAt).getTime()
    : 0;
  const existingPosted = existing.postedAt ? new Date(existing.postedAt).getTime() : 0;
  return candidatePosted > existingPosted;
}
