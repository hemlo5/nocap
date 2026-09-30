path = 'src/components/jobs/job-card.tsx'
with open(path, 'rb') as f:
    d = f.read()
orig = d

# Confirmed LF endings. Exact byte slices from inspection:
# Expanded card (line ~289): asChild + Link /jobs/id
# Compact card (line ~404): asChild + Link /jobs/id

# Replace "asChild" Details buttons with plain onClick buttons
import re

# Pattern: <Button asChild ...><Link href={`/jobs/${encodeURIComponent(job.id)}`}>Details</Link></Button>
pattern = (
    rb'(<Button) asChild ([^>]*?)>\s*'
    rb'<Link href=\{`/jobs/\$\{encodeURIComponent\(job\.id\)\}`\}>Details</Link>\s*'
    rb'(</Button>)'
)

def replacer(m):
    attrs = m.group(2)
    # inject onClick, remove asChild
    return (
        b'<Button ' + attrs + b' type="button" onClick={() => onSelect(job)}>\n              Details\n            </Button>'
    )

new_d, count = re.subn(pattern, replacer, d)
print(f'Replaced {count} Details button(s)')

if new_d != orig:
    with open(path, 'wb') as f:
        f.write(new_d)
    print(f'Saved ({len(orig)}->{len(new_d)} bytes)')
else:
    print('No change — trying manual slice approach')
    # Manual: find exact slices and replace
    SEP = b'\n'
    # Find the two occurrences
    NEEDLE = b'<Link href={`/jobs/${encodeURIComponent(job.id)}`}>Details</Link>'
    positions = []
    start = 0
    while True:
        idx = d.find(NEEDLE, start)
        if idx == -1:
            break
        positions.append(idx)
        start = idx + 1
    print(f'Found {len(positions)} Details links at positions {positions}')
    for pos in positions:
        ctx = d[max(0, pos-200):pos+100]
        print(repr(ctx))
