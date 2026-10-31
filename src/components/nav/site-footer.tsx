import Link from "next/link";
import { Map } from "lucide-react";
import { categoryDetails, getAllAreas, nocapPlaceCategories } from "@/lib/nocap/places";

export function SiteFooter() {
  const topAreas = getAllAreas().slice(0, 8);
  return (
    <footer className="border-t border-zinc-200 bg-white text-sm text-zinc-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="md:col-span-2"><Link href="/" className="inline-flex"><img src="/nocap-logo.png" alt="NoCapBLR" className="h-8 w-auto object-contain" /></Link><p className="mt-4 max-w-sm text-sm leading-6">Before You Go, Know. NoCapBLR helps Bengaluru residents find useful place context and share location-aware reviews.</p><p className="mt-4 text-xs font-semibold text-red-700">Bengaluru local discovery</p></div>
          <div><h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">Categories</h3><ul className="mt-4 space-y-2.5">{nocapPlaceCategories.map((cat) => <li key={cat}><Link href={`/categories/${cat}`} className="text-xs font-medium hover:text-zinc-950">{categoryDetails[cat]?.name ?? cat}</Link></li>)}<li><Link href="/map" className="flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline"><Map className="h-3 w-3" />Interactive map</Link></li></ul></div>
          <div><h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">Neighborhoods</h3><ul className="mt-4 space-y-2.5">{topAreas.map((area) => <li key={area.slug}><Link href={`/areas/${area.slug}`} className="text-xs font-medium hover:text-zinc-950">{area.name} <span className="text-zinc-400">({area.count})</span></Link></li>)}</ul></div>
          <div><h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">NoCapBLR</h3><ul className="mt-4 space-y-2.5">{[["/how-it-works", "How it works"], ["/why-nocapblr", "Why NoCapBLR"], ["/guides", "Local guides"], ["/campaigns", "Campaign story"], ["/posters", "Street posters archive"], ["/founder/aniket-vaishu", "Meet Aniket Vaishu"], ["/newsroom", "Newsroom"], ["/community-guidelines", "Community guidelines"], ["/moderation-policy", "Moderation policy"], ["/privacy", "Privacy policy"], ["/terms", "Terms"]].map(([href, label]) => <li key={href}><Link href={href} className="text-xs font-medium hover:text-zinc-950">{label}</Link></li>)}<li><a href="mailto:nocapblr@gmail.com" className="text-xs font-medium hover:text-zinc-950">nocapblr@gmail.com</a></li></ul></div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-100 pt-6 text-xs text-zinc-500 sm:flex-row"><p>Copyright {new Date().getFullYear()} NoCapBLR. All rights reserved.</p><p className="font-medium">Made for Bengaluru</p></div>
      </div>
    </footer>
  );
}
