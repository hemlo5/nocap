import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "green" | "purple" | "gray" | "blue" | "amber" | "zinc";
  className?: string;
};

const tones = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  purple: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
  gray: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200/80",
  zinc: "bg-zinc-900 text-zinc-100 ring-1 ring-inset ring-zinc-800",
  blue: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-400/30",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
};

export function Badge({ children, tone = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-2 text-[11px] font-medium tracking-tight transition-colors",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}