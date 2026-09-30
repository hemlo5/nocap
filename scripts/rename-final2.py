"""Final sweep — fix every last NearHire reference in UI files."""
import os, re

ROOT = r"c:\Users\amrut\OneDrive\Desktop\nearhire"

def fix(rel, pairs):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return
    with open(path, "rb") as f:
        d = f.read()
    orig = d
    for old, new in pairs:
        d = d.replace(old.encode(), new.encode())
    if d != orig:
        with open(path, "wb") as f:
            f.write(d)
        print(f"  fixed: {rel}")

# job-map.tsx — all remaining nearhire- CSS class names + TypeScript type names
fix("src/components/map/job-map.tsx", [
    ("NearHireMapStyle",         "HemloMapStyle"),
    ("nearhire-job-marker",      "hemlo-job-marker"),
    ("nearhire-entity-marker",   "hemlo-entity-marker"),
    ("nearhire-marker-glow",     "hemlo-marker-glow"),
    ("nearhire-marker-ripple",   "hemlo-marker-ripple"),
    ("nearhire-map-popup",       "hemlo-map-popup"),
    ("nearhire-radar-popup",     "hemlo-radar-popup"),
])

# globals.css — animation keyframe names
fix("src/app/globals.css", [
    ("nearhire-marker-ripple",   "hemlo-marker-ripple"),
    ("nearhire-",                "hemlo-"),
])

# page.tsx (root) — import still says NearHireApp (internal, file not renamed)
# NearHireApp is an internal component name — not visible to users, skip

# pain-points page — "Back to NearHire" link text visible to users
fix("src/app/pain-points/page.tsx", [
    ("Back to NearHire", "Back to hemlo"),
    ("Market Pain Points - NearHire", "Market Pain Points — hemlo"),
])

# pulse page title
fix("src/app/pulse/page.tsx", [
    ("Startup Pulse - NearHire", "Startup Pulse — hemlo"),
])

# nav comment
fix("src/components/nav/main-nav.tsx", [
    ("NearHireApp injects location search here",
     "HemloApp injects location search here"),
])

# nearhire-app.tsx — internal comment only (function name stays, it's an import alias)
fix("src/components/nearhire-app.tsx", [
    ("Main NearHireApp", "Main HemloApp"),
])

# Verify
import subprocess
result = subprocess.run(
    ["powershell", "-Command",
     "Get-ChildItem -Path src/app,src/components -Recurse -Include *.tsx,*.ts,*.css | "
     "Select-String -Pattern 'NearHire|nearhire-' | "
     "Select-Object Filename,LineNumber,Line | Format-Table -Wrap"],
    cwd=ROOT, capture_output=True, text=True
)
print(result.stdout or "(none)")
print("DONE")
