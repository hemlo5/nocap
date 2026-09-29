import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoverageDashboard } from "@/components/admin/coverage-dashboard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function CoveragePage() {
  return (
    <main className="min-h-screen bg-[#F7F8FB] px-4 py-5 text-[#111827] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Open app</Link>
          </Button>
        </div>
        <CoverageDashboard />
      </div>
    </main>
  );
}
