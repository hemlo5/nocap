"use client";

import { useState, type ReactNode } from "react";
import { Filter, GraduationCap, Radio, Rocket, Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type {
  EmploymentType,
  JobField,
  SourceProvider,
  StartupRoleType,
  WorkMode,
} from "@/lib/types";

export type FilterState = {
  sourceProvider: SourceProvider | "all";
  employmentType: EmploymentType | "all";
  workMode: WorkMode | "any";
  field: JobField | "all";
  radius: number;
  salaryMin: number | null;
  freshness: "any" | "24h" | "3d" | "7d" | "30d";
  query: string;
  startupOnly: boolean;
  studentRelevantOnly: boolean;
  startupRoleType: StartupRoleType | "all";
  showRemoteOnMap: boolean;
};

type FilterPanelProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const [mobileExpanded, setMobileExpanded] = useState(false);

  const activeFilterCount = [
    Boolean(filters.query?.trim()),
    filters.startupOnly,
    filters.studentRelevantOnly,
    filters.employmentType !== "all",
    filters.workMode !== "any",
    filters.field !== "all",
    filters.radius !== 40,
    filters.salaryMin !== null,
    filters.freshness !== "any",
  ].filter(Boolean).length;

  const resetFilters = () => {
    onChange({
      sourceProvider: "all",
      employmentType: "all",
      workMode: "any",
      field: "all",
      radius: 40,
      salaryMin: null,
      freshness: "any",
      query: "",
      startupOnly: false,
      studentRelevantOnly: false,
      startupRoleType: "all",
      showRemoteOnMap: false,
    });
  };

  return (
    <aside className="min-h-0 border-b border-zinc-200/80 bg-white p-3.5 sm:p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 text-white px-1.5 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              title="Reset all filters"
              className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors px-1.5 py-0.5 rounded"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="lg:hidden flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 px-2 py-1 rounded-md bg-zinc-100 transition-colors"
          >
            {mobileExpanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className={mobileExpanded ? "mt-3.5 block" : "mt-3.5 hidden lg:block"}>
        {/* Search query */}
        <label className="mb-4 block">
          <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <Search className="h-3 w-3" />
            Keyword
          </span>
          <Input
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder="Role, tech stack, company..."
            className="h-8 text-xs"
          />
        </label>

        {/* Mode Segmented Selection */}
        <fieldset className="mb-4">
          <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Mode
          </legend>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-100 p-1">
            <ModeButton
              active={!filters.startupOnly && filters.employmentType === "all"}
              label="All roles"
              onClick={() =>
                onChange({
                  ...filters,
                  startupOnly: false,
                  employmentType: "all",
                  studentRelevantOnly: false,
                })
              }
            />
            <ModeButton
              active={filters.startupOnly && filters.employmentType !== "internship"}
              label="Startups"
              onClick={() =>
                onChange({
                  ...filters,
                  startupOnly: true,
                  employmentType: "all",
                })
              }
            />
            <ModeButton
              active={!filters.startupOnly && filters.employmentType === "internship"}
              label="Internships"
              onClick={() =>
                onChange({
                  ...filters,
                  startupOnly: false,
                  employmentType: "internship",
                  studentRelevantOnly: true,
                })
              }
            />
            <ModeButton
              active={filters.startupOnly && filters.employmentType === "internship"}
              label="Startup interns"
              onClick={() =>
                onChange({
                  ...filters,
                  startupOnly: true,
                  employmentType: "internship",
                  studentRelevantOnly: true,
                })
              }
            />
          </div>
        </fieldset>

        {/* Toggles */}
        <div className="mb-4 space-y-1.5">
          <SwitchControl
            checked={filters.startupOnly}
            icon={<Rocket className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
            label="Startup only"
            onChange={() => update("startupOnly", !filters.startupOnly)}
          />

          <SwitchControl
            checked={filters.studentRelevantOnly}
            icon={<GraduationCap className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
            label="Student-friendly"
            onChange={() =>
              update("studentRelevantOnly", !filters.studentRelevantOnly)
            }
          />

          <SwitchControl
            checked={filters.showRemoteOnMap}
            icon={<Radio className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
            label="Show remote on map"
            onChange={() => update("showRemoteOnMap", !filters.showRemoteOnMap)}
          />
        </div>

        {/* Source */}
        <FilterGroup
          label="Source"
          value={filters.sourceProvider}
          options={[
            ["all", "All sources"],
            ["yc", "YC only"],
          ]}
          onChange={(value) =>
            update("sourceProvider", value as FilterState["sourceProvider"])
          }
        />

        {/* Job Type */}
        <FilterGroup
          label="Job Type"
          value={filters.employmentType}
          options={[
            ["all", "All"],
            ["internship", "Internships"],
            ["full_time", "Full-time"],
            ["part_time", "Part-time"],
            ["contract", "Contract"],
          ]}
          onChange={(value) =>
            update("employmentType", value as FilterState["employmentType"])
          }
        />

        {/* Work Mode */}
        <FilterGroup
          label="Work Mode"
          value={filters.workMode}
          options={[
            ["any", "Any"],
            ["onsite", "On-site"],
            ["hybrid", "Hybrid"],
            ["remote", "Remote"],
          ]}
          onChange={(value) => update("workMode", value as FilterState["workMode"])}
        />

        {/* Field */}
        <FilterGroup
          label="Field"
          value={filters.field}
          options={[
            ["all", "All"],
            ["software", "Software"],
            ["ai_ml", "AI / ML"],
            ["product", "Product"],
            ["design", "Design"],
            ["finance", "Finance"],
            ["marketing", "Marketing"],
            ["sales", "Sales"],
            ["operations", "Operations"],
            ["other", "Other"],
          ]}
          onChange={(value) => update("field", value as FilterState["field"])}
        />

        {/* Startup Role */}
        <FilterGroup
          label="Startup Role"
          value={filters.startupRoleType}
          options={[
            ["all", "All"],
            ["engineering", "Engineering"],
            ["product", "Product"],
            ["founder_office", "Founder office"],
            ["growth", "Growth"],
            ["design", "Design"],
            ["sales", "Sales"],
            ["operations", "Ops"],
            ["finance", "Finance"],
            ["research", "Research"],
            ["other", "Other"],
          ]}
          onChange={(value) =>
            update("startupRoleType", value as FilterState["startupRoleType"])
          }
        />

        {/* Distance */}
        <FilterGroup
          label="Radius"
          value={String(filters.radius)}
          options={[
            ["5", "5 km"],
            ["10", "10 km"],
            ["25", "25 km"],
            ["50", "50 km"],
            ["100", "100 km"],
          ]}
          onChange={(value) => update("radius", Number(value))}
        />

        {/* Freshness */}
        <FilterGroup
          label="Freshness"
          value={filters.freshness}
          options={[
            ["any", "Any time"],
            ["24h", "24 hours"],
            ["3d", "3 days"],
            ["7d", "7 days"],
            ["30d", "30 days"],
          ]}
          onChange={(value) =>
            update("freshness", value as FilterState["freshness"])
          }
        />
      </div>
    </aside>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1.5 text-center text-[11px] font-semibold transition-all duration-150",
        active
          ? "bg-white text-zinc-900 shadow-2xs"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50",
      )}
    >
      {label}
    </button>
  );
}

function SwitchControl({
  checked,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-2.5 rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-100/70"
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="min-w-0 text-xs font-medium text-zinc-800">
          {label}
        </span>
      </span>
      <span
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out",
          checked ? "bg-zinc-900" : "bg-zinc-200",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out mt-0.5",
            checked ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

type FilterGroupProps = {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
};

function FilterGroup({ label, value, options, onChange }: FilterGroupProps) {
  return (
    <fieldset className="mb-3.5">
      <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([optionValue, labelText]) => {
          const isSelected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.98]",
                isSelected
                  ? "bg-zinc-900 text-white shadow-2xs font-semibold"
                  : "bg-zinc-50 border border-zinc-200/80 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 hover:bg-white",
              )}
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
export default FilterPanel;
