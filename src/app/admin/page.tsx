import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FB] px-5 py-8 text-[#111827]">
      <section className="mx-auto max-w-4xl rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <Button asChild variant="secondary" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to NearHire
          </Link>
        </Button>
        <div className="mt-8 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-blue-600">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Live source dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              The protected summary endpoint is available at
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5">
                /api/admin/summary
              </code>
              , with discovery details at
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5">
                /api/admin/discovery
              </code>
              . Both require a Bearer token matching
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5">
                ADMIN_TOKEN
              </code>
              . It summarizes the live sources used by the MVP search path,
              including ATS feeds, startup boards, and startup directory
              discovery.
            </p>
            <div className="mt-5">
              <Button asChild>
                <Link href="/admin/coverage">Open coverage dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
