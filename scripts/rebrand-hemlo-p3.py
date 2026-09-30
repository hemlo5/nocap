"""
Phase 3 — Apply stitch-design-taste standards properly:
- Charcoal Ink (#18181B) instead of pure #0A0A0A
- Canvas White (#F9FAFB) for app bg (warm neutral)
- Pure white (#FFF) for cards
- Whisper borders
- Fix all remaining blue refs in carousel, filter-panel, etc.
"""
import os

ROOT = r"c:\Users\amrut\OneDrive\Desktop\nearhire"

def patch(rel_path, replacements, verbose=True):
    path = os.path.join(ROOT, rel_path)
    if not os.path.exists(path):
        print(f"  SKIP (not found): {rel_path}")
        return
    with open(path, "rb") as f:
        data = f.read()
    original = data
    for old, new in replacements:
        if isinstance(old, str): old = old.encode("utf-8")
        if isinstance(new, str): new = new.encode("utf-8")
        count = data.count(old)
        if count:
            data = data.replace(old, new)
            if verbose: print(f"  [{rel_path}] x{count}: {old[:60]}")
        else:
            if verbose: print(f"  [{rel_path}] MISS: {old[:70]}")
    if data != original:
        with open(path, "wb") as f:
            f.write(data)
        print(f"  [{rel_path}] saved ({len(original)}->{len(data)})")

# ── Upgrade #0A0A0A → #18181B (Charcoal Ink, per design taste) ───────────────
CHARCOAL = "#18181B"
for rel in [
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/components/nav/main-nav.tsx",
    "src/components/nearhire-app.tsx",
    "src/components/jobs/mobile-filter-drawer.tsx",
    "src/components/ui/button.tsx",
    "src/components/jobs/job-card.tsx",
    "src/components/jobs/loading-state.tsx",
    "src/components/ui/badge.tsx",
]:
    patch(rel, [
        ("#0A0A0A", CHARCOAL),
    ], verbose=False)
print("  Charcoal Ink applied across all files")

# ── App background: use Canvas White (#F9FAFB) not pure white ─────────────────
patch("src/app/globals.css", [
    ("--background: #ffffff;", "--background: #f9fafb;"),
    ("--foreground: #0a0a0a;", "--foreground: #18181b;"),
])
patch("src/app/layout.tsx", [
    ('className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-white`}',
     'className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full antialiased bg-[#F9FAFB]`}'),
    ('className="h-full min-h-screen flex flex-col bg-white text-[#18181B]"',
     'className="h-full min-h-screen flex flex-col bg-[#F9FAFB] text-[#18181B]"'),
])

# ── nearhire-app: fix app bg in main + loading skeleton ───────────────────────
patch("src/components/nearhire-app.tsx", [
    # Main bg
    ('bg-white text-[#0A0A0A]', 'bg-[#F9FAFB] text-[#18181B]'),
    # All hardcoded whites to stay white where appropriate
    # Hub chip bar bg — Canvas White
    ('bg-[#FAFAFA]', 'bg-[#F9FAFB]'),
    ('from-[#FAFAFA]', 'from-[#F9FAFB]'),
    # Panel header: bg-white stays (cards are pure white)
    # Map toggle active: stays zinc-900 (dark)
])

# ── job-depth-carousel: fix remaining blues ───────────────────────────────────
patch("src/components/jobs/job-depth-carousel.tsx", [
    ("bg-blue-500/10 border border-blue-400/30", "bg-zinc-100 border border-zinc-200/80"),
    ("text-blue-500 shadow-sm",                   "text-zinc-600 shadow-sm"),
    ("bg-blue-50 border border-blue-200",         "bg-zinc-100 border border-zinc-200"),
    ("text-blue-700",                              "text-[#18181B]"),
    ("text-blue-600",                              "text-[#18181B]"),
    ("text-blue-400",                              "text-zinc-500"),
    ("text-blue-300",                              "text-zinc-400"),
    ("hover:text-blue-300",                        "hover:text-zinc-300"),
    ("bg-blue-500/20",                             "bg-zinc-200/60"),
    ("bg-blue-600/20",                             "bg-zinc-200/60"),
    ("border-blue-500/20",                         "border-zinc-300/40"),
    ("border-blue-500/30",                         "border-zinc-300/40"),
    ("hover:border-blue-500/50",                   "hover:border-zinc-500/40"),
    ("group-hover:text-blue-300",                  "group-hover:text-zinc-300"),
    ("group-hover:text-blue-600",                  "group-hover:text-[#18181B]"),
    ("hover:text-blue-600",                        "hover:text-[#18181B]"),
])

# ── filter-panel: scan for blue ───────────────────────────────────────────────
patch("src/components/jobs/filter-panel.tsx", [
    ("bg-blue-600", "bg-[#18181B]"),
    ("hover:bg-blue-700", "hover:bg-zinc-800"),
    ("text-blue-600", "text-[#18181B]"),
    ("border-blue-500", "border-[#18181B]"),
    ("ring-blue-500", "ring-[#18181B]"),
    ("focus:ring-blue-500", "focus:ring-[#18181B]"),
    ("bg-blue-50", "bg-zinc-50"),
    ("text-blue-700", "text-[#18181B]"),
    ("border-blue-200", "border-zinc-200"),
    ("bg-blue-100", "bg-zinc-100"),
    ("text-blue-900", "text-[#18181B]"),
    ("ring-blue-600", "ring-[#18181B]"),
    ("aria-selected:bg-blue-50", "aria-selected:bg-zinc-50"),
    ("aria-selected:text-blue-900", "aria-selected:text-[#18181B]"),
    ("hover:bg-blue-50", "hover:bg-zinc-50"),
    ("hover:text-blue-700", "hover:text-[#18181B]"),
])

# ── empty-state.tsx ───────────────────────────────────────────────────────────
patch("src/components/jobs/empty-state.tsx", [
    ("bg-blue-600", "bg-[#18181B]"),
    ("hover:bg-blue-700", "hover:bg-zinc-800"),
    ("text-blue-600", "text-[#18181B]"),
    ("text-blue-500", "text-zinc-500"),
])

# ── coverage-dashboard.tsx ────────────────────────────────────────────────────
patch("src/components/pulse/coverage-dashboard.tsx", [
    ("text-blue-600", "text-[#18181B]"),
    ("bg-zinc-100 text-blue-600", "bg-zinc-100 text-[#18181B]"),
])

# ── pulse/page.tsx ─────────────────────────────────────────────────────────────
patch("src/app/(pulse)/pulse/page.tsx", [
    ("text-blue-600", "text-[#18181B]"),
    ("bg-blue-600", "bg-[#18181B]"),
    ("text-blue-600", "text-[#18181B]"),
    ("bg-blue-50", "bg-zinc-50"),
    ("group-hover:text-blue-600", "group-hover:text-[#18181B]"),
    ("hover:text-blue-600", "hover:text-[#18181B]"),
])

# ── loading-state: no circular spinner (design taste bans them) ───────────────
# The FilterSkeleton/MapSkeleton are already shimmer-based - good
# The LoadingState spinner — replace with shimmer
print("  Phase 3 done")
