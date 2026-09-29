import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  radius: number;
  onExpand: () => void;
  onReset: () => void;
};

export function EmptyState({ radius, onExpand, onReset }: EmptyStateProps) {
  const nextRadius = radius < 25 ? 25 : radius < 50 ? 50 : 100;

  return (
    <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center bg-white">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 shadow-2xs">
        <Search className="h-5 w-5" />
      </div>
      <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
        No verified opportunities within {radius} km
      </h2>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
        We index only verified physical locations and confirmed openings across Bengaluru. Try expanding search distance or resetting filters.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={onExpand} variant="primary" size="sm">
          <MapPin className="h-3.5 w-3.5" />
          <span>Expand to {nextRadius} km</span>
        </Button>
        <Button type="button" onClick={onReset} variant="secondary" size="sm">
          <span>Reset filters</span>
        </Button>
      </div>
    </div>
  );
}