"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterPanel, type FilterState } from "@/components/jobs/filter-panel";
import { cn } from "@/lib/utils/cn";

interface MobileFilterDrawerProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

export function MobileFilterDrawer({ filters, onChange }: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.sourceProvider !== "all",
    filters.employmentType !== "all",
    filters.workMode !== "any",
    filters.field !== "all",
    filters.radius !== 40,
    filters.salaryMin !== null,
    filters.freshness !== "any",
    filters.query !== "",
    filters.startupOnly,
    filters.studentRelevantOnly,
  ].filter(Boolean).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-semibold transition-all touch-manipulation select-none active:scale-95",
          activeCount > 0
            ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
            : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300",
        )}
      >
        <SlidersHorizontal className="h-3 w-3 shrink-0" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-zinc-900 text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px] touch-none"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[9999] flex flex-col bg-white rounded-t-2xl shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] max-h-[82dvh]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="relative shrink-0 flex items-center justify-between px-4 pt-4 pb-2.5 border-b border-zinc-100">
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-zinc-200" />
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-bold text-zinc-900">Filters</span>
            {activeCount > 0 && (
              <span className="text-xs text-zinc-500">{activeCount} active</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-90 transition-all touch-manipulation"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <FilterPanel filters={filters} onChange={onChange} />
        </div>

        <div className="shrink-0 px-4 pb-6 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-xl bg-zinc-900 text-white text-sm font-bold active:scale-[0.98] transition-transform touch-manipulation"
          >
            {activeCount > 0 ? `Apply ${activeCount} filter${activeCount > 1 ? "s" : ""}` : "Done"}
          </button>
        </div>
      </div>
    </>
  );
}