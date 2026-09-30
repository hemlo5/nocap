"""Fix broken layout in nearhire-app.tsx - handles CRLF line endings."""
import sys

path = "src/components/nearhire-app.tsx"
with open(path, "rb") as f:
    raw = f.read()

# Work in bytes to avoid any encoding/newline issues
OLD = (
    b'<div className="grid h-full min-h-0 flex-1 lg:overflow-hidden lg:grid-cols-[172px_minmax(0,1fr)]">\r\n'
    b'                {/* Desktop-only filter sidebar \xe2\x80\x94 mobile uses MobileFilterDrawer */}\r\n'
    b'                <div className="hidden lg:contents">\r\n'
    b'                  {isBusy ? <FilterSkeleton /> : <FilterPanel filters={filters} onChange={setFilters} />}\r\n'
    b'                </div>\r\n'
    b'                <div className="min-h-0 h-full overflow-y-auto">\r\n'
    b'                  {isBusy ? <LoadingState /> : jobs.length === 0 ? (\r\n'
    b'                    <EmptyState radius={filters.radius} onExpand={() => setFilters({ ...filters, radius: 50 })} onReset={() => setFilters(defaultFilters)} />\r\n'
    b'                  ) : (\r\n'
    b'                    <div className="space-y-3 p-3 sm:p-4">\r\n'
    b'                      {jobs.map(job => (\r\n'
    b'                        <JobCard key={job.id} job={job} selected={job.id === selectedJobId} onSelect={j => setSelectedJobId(j.id)} expanded={false} />\r\n'
    b'                      ))}\r\n'
    b'                    </div>\r\n'
    b'                  )}\r\n'
    b'                </div>\r\n'
    b'              </div>'
)

NEW = (
    b'<div className="flex h-full min-h-0 overflow-hidden">\r\n'
    b'                {/* Desktop filter sidebar \xe2\x80\x94 hidden on mobile, drawer used instead */}\r\n'
    b'                <aside className="hidden lg:flex lg:w-[172px] lg:shrink-0 lg:flex-col lg:border-r lg:border-zinc-100 overflow-y-auto">\r\n'
    b'                  {isBusy ? <FilterSkeleton /> : <FilterPanel filters={filters} onChange={setFilters} />}\r\n'
    b'                </aside>\r\n'
    b'                {/* Job cards \xe2\x80\x94 fills all remaining width on every screen size */}\r\n'
    b'                <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">\r\n'
    b'                  {isBusy ? <LoadingState /> : jobs.length === 0 ? (\r\n'
    b'                    <EmptyState radius={filters.radius} onExpand={() => setFilters({ ...filters, radius: 50 })} onReset={() => setFilters(defaultFilters)} />\r\n'
    b'                  ) : (\r\n'
    b'                    <div className="space-y-3 p-3 sm:p-4">\r\n'
    b'                      {jobs.map(job => (\r\n'
    b'                        <JobCard key={job.id} job={job} selected={job.id === selectedJobId} onSelect={j => setSelectedJobId(j.id)} expanded={false} />\r\n'
    b'                      ))}\r\n'
    b'                    </div>\r\n'
    b'                  )}\r\n'
    b'                </div>\r\n'
    b'              </div>'
)

if OLD not in raw:
    print("ERROR: exact byte pattern not found")
    idx = raw.find(b"hidden lg:contents")
    print(f"'hidden lg:contents' at index: {idx}")
    sys.exit(1)

patched = raw.replace(OLD, NEW, 1)

with open(path, "wb") as f:
    f.write(patched)

print(f"Done. {len(raw)} -> {len(patched)} bytes")
print("Verify: 'hidden lg:contents' still present:", b"hidden lg:contents" in patched)
print("Verify: new aside tag present:", b'lg:flex lg:w-[172px]' in patched)
