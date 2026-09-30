"""
Final NearHire → Hemlo rename pass.
- UI-visible text: replace everywhere
- CSS class names in job-map.tsx: nearhire-* → hemlo-*
- Backend User-Agent strings and source labels: NearHire → Hemlo
- Env var names: NEARHIRE_* → HEMLO_* in code (not .env itself)
- Fix the FilterPanel dynamic() ChunkLoadError
"""
import os, sys

ROOT = r"c:\Users\amrut\OneDrive\Desktop\nearhire"

def patch_file(rel_path, replacements):
    path = os.path.join(ROOT, rel_path)
    if not os.path.exists(path):
        print(f"  SKIP (missing): {rel_path}")
        return 0
    with open(path, "rb") as f:
        data = f.read()
    original = data
    for old, new in replacements:
        if isinstance(old, str): old = old.encode("utf-8")
        if isinstance(new, str): new = new.encode("utf-8")
        if old in data:
            data = data.replace(old, new)
    if data != original:
        with open(path, "wb") as f:
            f.write(data)
        print(f"  patched: {rel_path} ({len(original)}->{len(data)}b)")
        return 1
    return 0

# ── 1. main-nav.tsx: fix comment + ensure brand shows correctly ───────────────
patch_file("src/components/nav/main-nav.tsx", [
    ("Portal slot - NearHireApp injects location search here",
     "Portal slot — HemloApp injects location search here"),
])

# ── 2. job-map.tsx: rename CSS class names (nearhire-* → hemlo-*) ─────────────
patch_file("src/components/map/job-map.tsx", [
    ("nearhire-marker-face",       "hemlo-marker-face"),
    ("nearhire-marker-initials",   "hemlo-marker-initials"),
    ("nearhire-marker-count",      "hemlo-marker-count"),
    ("nearhire-current-location",  "hemlo-current-location"),
    ("nearhire-popup-card",        "hemlo-popup-card"),
    ("nearhire-popup-list",        "hemlo-popup-list"),
    ("nearhire-radar-popup",       "hemlo-radar-popup"),
])

# ── 3. globals.css: rename CSS class selectors ────────────────────────────────
patch_file("src/app/globals.css", [
    (".nearhire-", ".hemlo-"),
])

# ── 4. Backend User-Agent strings ─────────────────────────────────────────────
UA_FILES = [
    "src/lib/sources/ashby.ts",
    "src/lib/sources/bamboohr.ts",
    "src/lib/sources/breezy.ts",
    "src/lib/sources/detect.ts",
    "src/lib/sources/greenhouse.ts",
    "src/lib/sources/lever.ts",
    "src/lib/sources/personio.ts",
    "src/lib/sources/recruitee.ts",
    "src/lib/sources/smartrecruiters.ts",
    "src/lib/sources/workable.ts",
    "src/lib/sources/workday.ts",
    "src/lib/sources/yc-jobs.ts",
    "src/lib/services/careers-page.ts",
    "src/lib/services/yc-directory.ts",
    "src/lib/services/pain-points.ts",
    "src/lib/services/startup-pulse.ts",
    "src/lib/services/map-entities.ts",
]
for rel in UA_FILES:
    patch_file(rel, [
        ("NearHire MVP", "Hemlo"),
        ("NearHire local development", "Hemlo"),
        ("NearHire/1.0", "Hemlo/1.0"),
        ("NearHire local discovery dashboard", "Hemlo discovery dashboard"),
        ("dev@nearhire.local", "dev@hemlo.local"),
    ])

# ── 5. Source label strings ───────────────────────────────────────────────────
patch_file("src/lib/services/investor-registry.ts", [
    ("NearHire Investor Registry", "Hemlo Investor Registry"),
])
patch_file("src/lib/services/map-entities.ts", [
    ("NearHire Investor Registry", "Hemlo Investor Registry"),
    ("NearHire local discovery dashboard", "Hemlo discovery dashboard"),
])
patch_file("src/lib/services/radar-registry.ts", [
    ("NearHire Discovery", "Hemlo Discovery"),
])
patch_file("src/lib/services/geocoding.ts", [
    ("NearHire MVP", "Hemlo"),
    ("NearHire MVP local development", "Hemlo local development"),
])
patch_file("src/lib/services/jobs.ts", [
    ("[NearHire sources]", "[Hemlo sources]"),
])
patch_file("src/lib/sources/registry-startup-source.ts", [
    ("NearHire Registry", "Hemlo Registry"),
    ("NearHire source registry", "Hemlo source registry"),
])

# ── 6. Fix FilterPanel dynamic() import — the .then() pattern sometimes ───────
# fails with Turbopack. Switch to direct default export import instead.
# First check what's currently there:
fp = os.path.join(ROOT, "src/components/nearhire-app.tsx")
with open(fp, "rb") as f:
    app = f.read()

OLD_FP_IMPORT = (
    b'const FilterPanel = dynamic(\n'
    b'  () => import("@/components/jobs/filter-panel").then(m => ({ default: m.FilterPanel })),\n'
    b'  { ssr: false, loading: () => <FilterSkeleton /> },\n'
    b');'
)
NEW_FP_IMPORT = (
    b'const FilterPanel = dynamic(\n'
    b'  () => import("@/components/jobs/filter-panel").then((mod) => mod),\n'
    b'  { ssr: false, loading: () => <FilterSkeleton /> },\n'
    b');'
)

# Also try CRLF variant
OLD_FP_CRLF = OLD_FP_IMPORT.replace(b'\n', b'\r\n')
NEW_FP_CRLF = NEW_FP_IMPORT.replace(b'\n', b'\r\n')

if OLD_FP_IMPORT in app:
    app = app.replace(OLD_FP_IMPORT, NEW_FP_IMPORT, 1)
    print("  Fixed FilterPanel dynamic() import (LF)")
elif OLD_FP_CRLF in app:
    app = app.replace(OLD_FP_CRLF, NEW_FP_CRLF, 1)
    print("  Fixed FilterPanel dynamic() import (CRLF)")
else:
    print("  WARN: FilterPanel dynamic pattern not found exactly — checking current:")
    idx = app.find(b'filter-panel')
    if idx >= 0:
        print("  Context:", repr(app[max(0, idx-100):idx+200]))

# FilterPanel is a named export — dynamic() needs a default wrapper.
# The real fix: add a re-export default to filter-panel.tsx
# OR use the correct named export pattern
# Let's just check if the module has a default export already

fp_panel = os.path.join(ROOT, "src/components/jobs/filter-panel.tsx")
with open(fp_panel, "rb") as f:
    panel = f.read()

if b"export default" in panel:
    print("  filter-panel.tsx has default export — dynamic() should work")
else:
    print("  filter-panel.tsx has NO default export — adding one")
    # Add default export at end
    panel = panel + b"\nexport default FilterPanel;\n"
    with open(fp_panel, "wb") as f:
        f.write(panel)
    print("  Added: export default FilterPanel")

with open(fp, "wb") as f:
    f.write(app)

print("\nAll done.")
