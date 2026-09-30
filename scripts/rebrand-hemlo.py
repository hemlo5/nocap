"""
Hemlo rebrand script — NearHire → Hemlo, blue → black color scheme.
Patches all files in binary mode to handle CRLF safely.
"""
import os, re

ROOT = r"c:\Users\amrut\OneDrive\Desktop\nearhire"

def patch(rel_path, replacements):
    path = os.path.join(ROOT, rel_path)
    with open(path, "rb") as f:
        data = f.read()
    original = data
    for old, new in replacements:
        if isinstance(old, str):
            old = old.encode("utf-8")
        if isinstance(new, str):
            new = new.encode("utf-8")
        count = data.count(old)
        if count:
            data = data.replace(old, new)
            print(f"  [{rel_path}] '{old[:40]}...' -> replaced {count}x")
        else:
            print(f"  [{rel_path}] WARN: '{old[:60]}' not found")
    if data != original:
        with open(path, "wb") as f:
            f.write(data)
        print(f"  [{rel_path}] written ({len(original)} -> {len(data)} bytes)")
    return data != original

# ── 1. package.json ───────────────────────────────────────────────────────────
patch("package.json", [
    ('"name": "nearhire"', '"name": "hemlo"'),
])

# ── 2. layout.tsx ─────────────────────────────────────────────────────────────
patch("src/app/layout.tsx", [
    ('NearHire - Jobs, Startups & Market Insights',
     'Hemlo \xe2\x80\x94 Jobs & Startups in Bengaluru'),
    ('Discover opportunities near you, follow Bengaluru startups, and explore real market problems.',
     'Find startup jobs, internships & tech roles on a live map of Bengaluru. 6,000+ opportunities from 150+ companies.'),
    # bg colour: grey → pure white
    ('bg-[#F7F8FB]`}', 'bg-white`}'),
    ('className="h-full min-h-screen flex flex-col bg-[#F7F8FB] text-[#111827]"',
     'className="h-full min-h-screen flex flex-col bg-white text-[#0A0A0A]"'),
])

# ── 3. globals.css ────────────────────────────────────────────────────────────
patch("src/app/globals.css", [
    ('--background: #f7f8fb;\r\n  --foreground: #111827;',
     '--background: #ffffff;\r\n  --foreground: #0a0a0a;'),
    ('background: var(--background);\r\n  color: var(--foreground);',
     'background: var(--background);\r\n  color: var(--foreground);'),
    # map background stays
])

# ── 4. main-nav.tsx — logo + wordmark ────────────────────────────────────────
patch("src/components/nav/main-nav.tsx", [
    # Logo icon: blue → black
    ('rounded-lg bg-blue-600 text-white shadow-2xs',
     'rounded-lg bg-[#0A0A0A] text-white shadow-2xs'),
    # Replace MapPin icon usage text with H letter
    ('<MapPin className="h-4 w-4" aria-hidden />',
     '<span className="text-xs font-black tracking-tight">H</span>'),
    # Wordmark: NearHire → hemlo
    ('>NearHire<', '>hemlo<'),
    # Change font weight/style for wordmark
    ('text-sm font-bold tracking-tight leading-none',
     'text-sm font-black tracking-tight leading-none'),
    # Active nav: bg-zinc-100 → bg-[#0A0A0A] text-white
    ('bg-zinc-100 text-zinc-900 shadow-2xs',
     'bg-[#0A0A0A] text-white shadow-2xs'),
    # Nav hover: zinc-100 → zinc-100 (keep but darken)
    # Pain points page bg stays dark (#070709)
    # Portal slot comment
    ('Portal slot \xe2\x80\x94 NearHireApp injects location search here',
     'Portal slot \xe2\x80\x94 HemloApp injects location search here'),
    # Lucide import — remove MapPin since we replaced it
    ('import { Briefcase, Activity, Compass, MapPin } from "lucide-react";',
     'import { Briefcase, Activity, Compass } from "lucide-react";'),
])

# ── 5. nearhire-app.tsx — colors, bg ─────────────────────────────────────────
patch("src/components/nearhire-app.tsx", [
    # App background: grey → white
    ('bg-[#F7F8FB] text-zinc-900', 'bg-white text-[#0A0A0A]'),
    ('bg-white', 'bg-white'),  # keep white (no-op to confirm)
    # Loading spinner: border-[#111827] → border-[#0A0A0A]
    ('border-[#111827] border-t-transparent', 'border-[#0A0A0A] border-t-transparent'),
    # Header text color
    ('text-[#111827]', 'text-[#0A0A0A]'),
    # Hub chip bar background
    ('bg-[#FAFBFD]', 'bg-[#FAFAFA]'),
    ('from-[#FAFBFD]', 'from-[#FAFAFA]'),
    # Search button: bg-zinc-900 → bg-[#0A0A0A]
    # Map toggle button text
    # Count text
    ('text-[#6B7280]', 'text-zinc-500'),
    ('text-[#9CA3AF]', 'text-zinc-400'),
    # Error banner stays red
    # Loading skeleton bg
    ('bg-[#E5E7EB]', 'bg-zinc-100'),
    # Spinner border
    ('border-[#111827]', 'border-[#0A0A0A]'),
])

# ── 6. mobile-filter-drawer.tsx ───────────────────────────────────────────────
patch("src/components/jobs/mobile-filter-drawer.tsx", [
    # Apply button stays black (already correct)
])

# ── 7. job-card.tsx — minimal border, clean shadow ────────────────────────────
patch("src/components/jobs/job-card.tsx", [
    # Selected state: blue ring → black ring
    ('ring-2 ring-blue-500', 'ring-2 ring-[#0A0A0A]'),
    ('ring-blue-500/20', 'ring-[#0A0A0A]/10'),
    ('border-blue-500/40', 'border-[#0A0A0A]/30'),
    # Apply button / CTA: blue → black
    ('bg-blue-600', 'bg-[#0A0A0A]'),
    ('hover:bg-blue-700', 'hover:bg-zinc-800'),
    ('text-blue-600', 'text-[#0A0A0A]'),
    ('hover:text-blue-700', 'hover:text-zinc-700'),
    ('focus:ring-blue-500', 'focus:ring-[#0A0A0A]'),
])

# ── 8. filter-panel.tsx — active filter: blue → black ────────────────────────
patch("src/components/jobs/filter-panel.tsx", [
    ('bg-blue-600', 'bg-[#0A0A0A]'),
    ('hover:bg-blue-700', 'hover:bg-zinc-800'),
    ('text-blue-600', 'text-[#0A0A0A]'),
    ('border-blue-500', 'border-[#0A0A0A]'),
    ('ring-blue-500', 'ring-[#0A0A0A]'),
    ('focus:ring-blue-500', 'focus:ring-[#0A0A0A]'),
    ('bg-blue-50', 'bg-zinc-50'),
    ('text-blue-700', 'text-[#0A0A0A]'),
    ('border-blue-200', 'border-zinc-200'),
])

# ── 9. loading-state.tsx — spinner color ──────────────────────────────────────
patch("src/components/jobs/loading-state.tsx", [
    ('border-blue-600', 'border-[#0A0A0A]'),
    ('bg-blue-600', 'bg-[#0A0A0A]'),
    ('text-blue-600', 'text-[#0A0A0A]'),
])

# ── 10. empty-state.tsx ───────────────────────────────────────────────────────
patch("src/components/jobs/empty-state.tsx", [
    ('bg-blue-600', 'bg-[#0A0A0A]'),
    ('hover:bg-blue-700', 'hover:bg-zinc-800'),
    ('text-blue-600', 'text-[#0A0A0A]'),
])

# ── 11. button.tsx (ui) ───────────────────────────────────────────────────────
patch("src/components/ui/button.tsx", [
    ('bg-blue-600', 'bg-[#0A0A0A]'),
    ('hover:bg-blue-700', 'hover:bg-zinc-800'),
])

print("\nDone. Run: npx tsc --noEmit")
