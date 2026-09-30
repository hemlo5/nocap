"""
Phase 2 of Hemlo rebrand — fix all remaining blue refs, redesign nav logo.
"""
import os

ROOT = r"c:\Users\amrut\OneDrive\Desktop\nearhire"

def patch(rel_path, replacements):
    path = os.path.join(ROOT, rel_path)
    with open(path, "rb") as f:
        data = f.read()
    original = data
    for old, new in replacements:
        if isinstance(old, str): old = old.encode("utf-8")
        if isinstance(new, str): new = new.encode("utf-8")
        count = data.count(old)
        if count:
            data = data.replace(old, new)
            print(f"  [{rel_path}] replaced {count}x: {old[:50]}")
        else:
            print(f"  [{rel_path}] MISS: {old[:70]}")
    if data != original:
        with open(path, "wb") as f:
            f.write(data)
        print(f"  [{rel_path}] saved")

# ── button.tsx: fix hover that still references blue ─────────────────────────
patch("src/components/ui/button.tsx", [
    ("hover:bg-blue-500 active:bg-blue-700 focus-visible:ring-blue-500/30",
     "hover:bg-zinc-800 active:bg-zinc-900 focus-visible:ring-zinc-900/20"),
])

# ── nearhire-app.tsx: remaining blues ────────────────────────────────────────
patch("src/components/nearhire-app.tsx", [
    # MapPin icon in search input - blue → zinc
    ('text-blue-600 z-10" />',   'text-zinc-700 z-10" />'),
    # Search input focus ring
    ("focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
     "focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"),
    # Loading spinner in search
    ('text-blue-500" viewBox',   'text-zinc-700" viewBox'),
    # Second spinner
    ('text-blue-500\n                    shrink-0" viewBox',
     'text-zinc-700\n                    shrink-0" viewBox'),
    # Prediction dropdown hover
    ("aria-selected:bg-blue-50/80 aria-selected:text-blue-900",
     "aria-selected:bg-zinc-50 aria-selected:text-zinc-900"),
    # Prediction icon bg
    ('rounded-full bg-blue-50 aria-selected:bg-blue-600',
     'rounded-full bg-zinc-100 aria-selected:bg-zinc-900'),
    # MapPin in prediction list
    ('h-3.5 w-3.5 text-blue-600" />',  'h-3.5 w-3.5 text-zinc-700" />'),
    # Hub card hover
    ("aria-selected:bg-blue-50/90 aria-selected:border-blue-200 hover:bg-blue-50/80\n                    hover:border-blue-200",
     "aria-selected:bg-zinc-50 aria-selected:border-zinc-300 hover:bg-zinc-50\n                    hover:border-zinc-300"),
    # GPS button icon
    ('h-3.5 w-3.5 text-blue-600" />\n        <span className="hidden md:inline">My location',
     'h-3.5 w-3.5 text-zinc-700" />\n        <span className="hidden md:inline">My location'),
    # Map toggle MapPin icon
    ('h-3.5 w-3.5 text-blue-600" /><span\n                            className="hidden sm:inline">Show map',
     'h-3.5 w-3.5 text-zinc-800" /><span\n                            className="hidden sm:inline">Show map'),
])

# ── job-card.tsx: selected ring + apply button ────────────────────────────────
patch("src/components/jobs/job-card.tsx", [
    # Selected ring
    ('? "border-blue-600 ring-2 ring-blue-600/15"',
     '? "border-zinc-900 ring-2 ring-zinc-900/10"'),
    # Verified badge text color
    ("text-blue-600", "text-emerald-700"),
])

# ── job-depth-carousel.tsx: ping animation ────────────────────────────────────
patch("src/components/jobs/job-depth-carousel.tsx", [
    ("border-blue-500/25 animate-ping",          "border-zinc-400/25 animate-ping"),
    ("bg-blue-500/10 border\n            border-blue-400/30 flex items-center justify-center text-blue-500",
     "bg-zinc-100 border\n            border-zinc-300/50 flex items-center justify-center text-zinc-600"),
    ("bg-blue-50 border border-blue-200 px-2.5 sm:px-3 py-0.5 text-[9px]\n                    sm:text-[9.5px] font-bold text-blue-700",
     "bg-zinc-100 border border-zinc-200 px-2.5 sm:px-3 py-0.5 text-[9px]\n                    sm:text-[9.5px] font-bold text-zinc-700"),
])

# ── job-map.tsx: focus ring on zoom buttons ───────────────────────────────────
patch("src/components/map/job-map.tsx", [
    ("focus:ring-blue-500/20", "focus:ring-zinc-900/10"),
])

# ── badge.tsx: blue badge variant ────────────────────────────────────────────
patch("src/components/ui/badge.tsx", [
    ('blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"',
     'blue: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-400/30"'),
])

# ── main-nav.tsx: redesign brand logo block completely ───────────────────────
# Replace the old logo div with the new H monogram design
OLD_LOGO = (
    b'          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A0A0A] text-white shadow-2xs transition-transform group-hover:scale-105">\r\n'
    b'            <span className="text-xs font-black tracking-tight">H</span>\r\n'
    b'          </div>\r\n'
    b'          <div className="flex flex-col">\r\n'
    b'            <span className="text-sm font-black tracking-tight leading-none">hemlo</span>\r\n'
    b'            <span className='
)
NEW_LOGO = (
    b'          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A0A0A] text-white shadow-sm transition-transform group-hover:scale-[1.04] shrink-0">\r\n'
    b'            <span className="text-[11px] font-black tracking-tighter select-none">H</span>\r\n'
    b'          </div>\r\n'
    b'          <div className="flex flex-col">\r\n'
    b'            <span className="text-[13px] font-black tracking-tight leading-none lowercase">hemlo</span>\r\n'
    b'            <span className='
)

path = os.path.join(ROOT, "src/components/nav/main-nav.tsx")
with open(path, "rb") as f:
    data = f.read()
if OLD_LOGO in data:
    data = data.replace(OLD_LOGO, NEW_LOGO, 1)
    with open(path, "wb") as f:
        f.write(data)
    print("  [main-nav.tsx] logo refined")

# ── pain-points-carousel.tsx: blue on dark bg — keep blue tint (dark page) ───
# (blue on dark bg is intentional on the pain-points dark page, skip)

# ── coverage-dashboard.tsx and pulse/page.tsx ─────────────────────────────────
for rel in ["src/components/pulse/coverage-dashboard.tsx"]:
    p = os.path.join(ROOT, rel)
    if os.path.exists(p):
        patch(rel, [
            ("text-blue-600", "text-zinc-700"),
        ])

print("\nDone.")
