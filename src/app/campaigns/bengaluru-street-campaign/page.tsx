import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/nav/site-footer";

const url = "https://nocapblr.com/campaigns/bengaluru-street-campaign";

export const metadata: Metadata = {
  title: "The NoCapBLR Bengaluru street campaign",
  description: "The founder-led grassroots campaign that introduced NoCapBLR in Bengaluru on October 25, 2026.",
  alternates: { canonical: url },
  openGraph: {
    title: "The NoCapBLR Bengaluru street campaign",
    description: "A founder-led grassroots Bengaluru launch on October 25, 2026.",
    url,
    type: "article",
    images: [{ url: "/campaign/1000149202.jpg", width: 1200, height: 1600, alt: "NoCapBLR campaign material in Bengaluru" }],
  },
};

const campaignImages = [
  { src: "/campaign/1000149202.jpg", alt: "NoCapBLR campaign material being shared in Bengaluru", priority: true },
  { src: "/campaign/IMG_20261026_030931.png", alt: "NoCapBLR campaign activity in Bengaluru" },
  { src: "/campaign/IMG_20261026_030331.png", alt: "NoCapBLR campaign activity in Bengaluru" },
  { src: "/campaign/Screenshot 2026-10-26 051511.png", alt: "NoCapBLR campaign screenshot" },
];

export default function BengaluruStreetCampaignPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: "The NoCapBLR Bengaluru street campaign", datePublished: "2026-10-25", dateModified: "2026-10-25", mainEntityOfPage: url, author: { "@type": "Person", name: "Aniket Vaishu" }, publisher: { "@id": "https://nocapblr.com/#organization" } };
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-6xl">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Campaign case study</p>
          <div className="mt-5 grid gap-10 border-b border-zinc-300 pb-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <h1 className="text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">A Bengaluru launch that put the product in people&apos;s hands.</h1>
            <p className="text-base leading-7 text-zinc-600">On October 25, 2026, NoCapBLR recorded 10,000 active users on its first day after a grassroots awareness campaign led by founder Aniket Vaishu. The launch was an attempt to meet Bengaluru where the product is meant to live: in the city, around real plans, real places, and everyday decisions about where to go next.</p>
          </div>

          <figure className="mt-10">
            <div className="grid gap-4 sm:grid-cols-2">
              {campaignImages.slice(0, 2).map((image) => (
                <div key={image.src} className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                  <Image src={image.src} alt={image.alt} fill priority={image.priority} className="object-contain" sizes="(min-width: 640px) 50vw, 100vw" />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {campaignImages.slice(2).map((image) => (
                <div key={image.src} className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                  <Image src={image.src} alt={image.alt} fill className="object-contain" sizes="(min-width: 640px) 50vw, 100vw" />
                </div>
              ))}
            </div>
            <figcaption className="text-xs leading-5 text-zinc-500 sm:col-span-2">Founder-provided campaign photographs and campaign material from the NoCapBLR Bengaluru launch.</figcaption>
          </figure>

          <div className="mx-auto mt-14 max-w-3xl space-y-8 text-base leading-8 text-zinc-700">
            <section><h2 className="text-2xl font-bold tracking-tight text-zinc-950">The idea behind the street-level launch</h2><p className="mt-3">NoCapBLR begins with a simple friction: people often arrive at a place with a picture in their head and leave with a different story. A cafe can be excellent at noon and impossible on a Saturday evening. A pub can work beautifully for one group and be too loud for another. A park can be calm in one season and crowded in another. The product exists to make those practical details easier to discover before the trip has already been made.</p><p className="mt-4">That is why a locally visible launch mattered. The campaign did not try to reduce Bengaluru to a list of viral recommendations. It introduced a map where people can browse familiar streets, food spots, parks, and cultural spaces, then add grounded observations from their own experience. The useful unit is not hype. It is context.</p></section>
            <section><h2 className="text-2xl font-bold tracking-tight text-zinc-950">What the first-day number means</h2><p className="mt-3">The confirmed number is specific: NoCapBLR recorded 10,000 active users on October 25, 2026, its first day. That is a meaningful early signal that the launch reached people across Bengaluru and that the product&apos;s premise connected with a live local audience. It is not, by itself, a promise about long-term retention, revenue, market share, or the quality of every future contribution.</p><p className="mt-4">NoCapBLR is deliberately clear about that distinction. During this repository audit, direct analytics access was not available, so this page does not invent QR scans, conversion percentages, press coverage, or secondary campaign statistics. The milestone remains founder-confirmed and the rest of the work is visible in the product: improve the map, improve the place data, and earn repeat use through practical value.</p></section>
            <section><h2 className="text-2xl font-bold tracking-tight text-zinc-950">Attention, disagreement, and trust</h2><p className="mt-3">A candid-review product naturally invites strong opinions. That is not a controversy narrative; it is the basic reality of letting people describe different experiences of the same place. NoCapBLR&apos;s job is not to manufacture disagreement or make a spectacle of it. It is to make space for specific, respectful contributions and to act when content crosses the line into harassment, deception, or privacy harm.</p><p className="mt-4">The campaign therefore has a longer purpose than a single day of attention. It is the starting point for a Bengaluru product that can remain useful after launch-day energy fades: one that makes discovery more local, reviews more contextual, and moderation more explicit.</p></section>
          </div>
          <div className="mt-14 border-t border-zinc-300 pt-8"><Link href="/founder/aniket-vaishu" className="text-sm font-bold text-red-700 hover:underline">Read about founder Aniket Vaishu</Link><Link href="/newsroom/nocapblr-reaches-10000-active-users-on-day-one" className="ml-6 text-sm font-bold text-red-700 hover:underline">Read the official announcement</Link></div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
