"""
Restore Details buttons to proper Link navigation + check getJobById.
The /jobs/[id] route exists and works — just needs the cache to be warm.
"""
path = 'src/components/jobs/job-card.tsx'
with open(path, 'rb') as f:
    d = f.read()
orig = d

# What's actually in the file right now?
needle = b'Details'
positions = []
start = 0
while True:
    idx = d.find(needle, start)
    if idx == -1: break
    positions.append(idx)
    start = idx + 1

print(f"Found 'Details' at {len(positions)} positions")
for pos in positions:
    print(f"\n--- pos {pos} ---")
    print(repr(d[max(0,pos-180):pos+60]))

with open(path, 'wb') as f:
    f.write(d)
print("\nFile unchanged (just inspecting)")
