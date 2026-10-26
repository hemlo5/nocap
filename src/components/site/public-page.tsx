import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteFooter } from "@/components/nav/site-footer";

const siteUrl = "https://nocapblr.com";

export type PublicSection = { heading: string; body: string };

export function publicMetadata(title: string, description: string, path: string): Metadata {
  const url = `${siteUrl}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "NoCapBLR", type: "website", images: [{ url: "/nocap-logo.png", width: 1200, height: 630, alt: "NoCapBLR" }] },
  };
}

export function PublicPage({ eyebrow, title, intro, sections, related = [] }: { eyebrow: string; title: string; intro: string; sections: PublicSection[]; related?: Array<{ href: string; label: string }> }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p>
          <div className="mt-4 grid gap-10 border-b border-zinc-300 pb-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,.85fr)] lg:items-end">
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-zinc-950 sm:text-6xl">{title}</h1>
            <p className="max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">{intro}</p>
          </div>
          <div className="grid gap-x-16 divide-y divide-zinc-200 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,.85fr)] lg:divide-y-0">
            <div className="divide-y divide-zinc-200">
              {sections.map((section) => (
                <section key={section.heading} className="py-8 sm:py-10">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{section.heading}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">{section.body}</p>
                </section>
              ))}
            </div>
            <aside className="border-t border-zinc-200 py-8 lg:mt-10 lg:border-t-0 lg:border-l lg:pl-8" aria-label="Explore NoCapBLR">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Explore NoCapBLR</p>
              <div className="mt-4 grid gap-2">
                <Link href="/map" className="inline-flex items-center justify-between border-b border-zinc-200 py-3 text-sm font-semibold text-zinc-950 hover:text-red-700"><span>Explore the Bengaluru map</span><MapPin className="h-4 w-4" /></Link>
                {related.map((item) => <Link key={item.href} href={item.href} className="inline-flex items-center justify-between border-b border-zinc-200 py-3 text-sm font-semibold text-zinc-950 hover:text-red-700"><span>{item.label}</span><ArrowRight className="h-4 w-4" /></Link>)}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
