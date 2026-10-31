import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/nav/site-footer";

const url = "https://nocapblr.com/founder/aniket-vaishu";

export const metadata: Metadata = {
  title: "Aniket Vaishu, founder of NoCapBLR",
  description: "Aniket Vaishu is the founder of NoCapBLR, a Bengaluru place-discovery product built around candid local context.",
  alternates: { canonical: url },
  openGraph: { title: "Aniket Vaishu, founder of NoCapBLR", description: "Founder of NoCapBLR.", url, type: "profile", images: [{ url: "/founder/IMG_20261010_115754.jpg", width: 1200, height: 1600, alt: "Aniket Vaishu in Bengaluru" }] },
};

export default function FounderPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "Person", name: "Aniket Vaishu", url: "https://www.aniket.social/", jobTitle: "Founder, NoCapBLR", worksFor: { "@id": "https://nocapblr.com/#organization" }, sameAs: ["https://www.aniket.social/"] };
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2]">
      <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-6xl">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Founder</p>
          <div className="mt-5 grid gap-10 border-b border-zinc-300 pb-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <h1 className="text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">Aniket Vaishu is building NoCapBLR from Bengaluru outward.</h1>
            <p className="text-base leading-7 text-zinc-600">Aniket Vaishu is a student founder and social entrepreneur. His work sits at the intersection of product building, entrepreneurship communities, and the practical question that drives NoCapBLR: how can people understand a place more honestly before committing their time and money?</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
            <div className="relative min-h-[480px] overflow-hidden bg-zinc-200"><Image src="/founder/IMG_20261010_115754.jpg" alt="Aniket Vaishu in Bengaluru" fill priority className="object-cover" sizes="(min-width: 1024px) 35vw, 100vw" /></div>
            <div className="relative min-h-[480px] overflow-hidden bg-zinc-200"><Image src="/campaign/IMG_20261026_030331.png" alt="NoCapBLR campaign activity in Bengaluru" fill className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" /></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">Founder-provided photographs from Bengaluru and the NoCapBLR campaign.</p>

          <div className="mx-auto mt-14 max-w-3xl space-y-8 text-base leading-8 text-zinc-700">
            <section><h2 className="text-2xl font-bold tracking-tight text-zinc-950">A product built around real local decisions</h2><p className="mt-3">NoCapBLR is Aniket&apos;s attempt to make place discovery feel closer to how Bengaluru actually works. People do not choose a cafe, pub, street, park, or cultural space in a vacuum. They weigh distance, time, mood, cost, a friend&apos;s experience, and the risk of turning up somewhere that does not match the version they saw online. A useful local product needs to respect that complexity without becoming noisy or performative.</p><p className="mt-4">The product&apos;s first-day campaign, which recorded 10,000 active users on October 25, 2026, put that thesis in public. It created a notable early moment of local attention around a simple proposition: before you go, know. The milestone is founder-confirmed. It is not used here as a shortcut to broader claims about market leadership or durable growth; the standard remains whether the product keeps being helpful after the launch.</p></section>
            <section><h2 className="text-2xl font-bold tracking-tight text-zinc-950">Entrepreneurship and campus work</h2><p className="mt-3">Alongside NoCapBLR, Aniket has worked across product-building interests that include fintech and DeFi. His entrepreneurship involvement has been associated with eChai, FSH, and campus entrepreneurship, and he serves as Campus Director at Hult at Kristu Jayanti University. These communities matter because they put ideas under pressure: an early product has to move beyond a pitch and become something people can actually use, question, and improve.</p><p className="mt-4">That community-facing perspective carries into NoCapBLR. The aim is not to declare that every contribution is automatically true, nor to turn disagreement into a spectacle. It is to make room for detailed experiences, location-aware context, and explicit moderation rules when the conversation stops being constructive.</p></section>
            <section><h2 className="text-2xl font-bold tracking-tight text-zinc-950">What comes next</h2><p className="mt-3">The interesting part of an early product begins after attention arrives. For NoCapBLR, that means expanding useful place coverage, making review quality clearer, protecting people who contribute in good faith, and being direct about the limits of the data. The platform will be judged by the consistency of those choices, not by an inflated origin story.</p></section>
          </div>

          <figure className="mx-auto mt-14 max-w-3xl border-t border-zinc-300 pt-8"><div className="relative min-h-[420px] overflow-hidden bg-zinc-200"><Image src="/founder/IMG-20261010-WA0039.jpg" alt="Founder-provided photograph from a campus entrepreneurship event" fill className="object-cover" sizes="(min-width: 1024px) 768px, 100vw" /></div><figcaption className="mt-3 text-xs leading-5 text-zinc-500">Founder-provided photograph from campus entrepreneurship activity.</figcaption></figure>
          <div className="mt-14 flex flex-wrap gap-6 border-t border-zinc-300 pt-8">
            <a href="https://www.aniket.social/" className="text-sm font-bold text-red-700 hover:underline">
              Visit aniket.social
            </a>
            <Link href="/campaigns/bengaluru-street-campaign" className="text-sm font-bold text-red-700 hover:underline">
              Read the NoCapBLR campaign story
            </Link>
            <Link href="/posters" className="text-sm font-bold text-red-700 hover:underline">
              View the street posters gallery (9)
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
