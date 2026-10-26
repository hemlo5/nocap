import type { MetadataRoute } from "next";
import { getAllAreas, nocapPlaceCategories, nocapPlaces } from "@/lib/nocap/places";

const baseUrl = "https://nocapblr.com";
const milestoneDate = new Date("2026-10-25T00:00:00+05:30");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    ["", 1, "weekly"], ["/map", 0.9, "daily"], ["/bengaluru", 0.85, "weekly"],
    ["/about", 0.7, "monthly"], ["/how-it-works", 0.7, "monthly"], ["/why-nocapblr", 0.7, "monthly"],
    ["/anonymous-reviews", 0.6, "monthly"], ["/community-guidelines", 0.5, "monthly"], ["/moderation-policy", 0.5, "monthly"],
    ["/report-content", 0.4, "monthly"], ["/contact", 0.4, "monthly"], ["/privacy", 0.3, "yearly"], ["/terms", 0.3, "yearly"],
    ["/guides", 0.7, "monthly"], ["/guides/how-to-check-a-cafe-before-visiting", 0.6, "monthly"], ["/guides/how-to-find-honest-pub-reviews", 0.6, "monthly"], ["/guides/how-to-assess-a-neighbourhood-before-visiting", 0.6, "monthly"], ["/guides/how-to-report-a-local-problem", 0.6, "monthly"],
  ] as const;
  const milestonePaths = ["/campaigns", "/campaigns/bengaluru-street-campaign", "/campaigns/behind-the-campaign", "/newsroom", "/newsroom/nocapblr-reaches-10000-active-users-on-day-one", "/founder/aniket-vaishu"];
  return [
    ...staticPaths.map(([path, priority, changeFrequency]) => ({ url: `${baseUrl}${path}`, priority, changeFrequency })),
    ...milestonePaths.map((path) => ({ url: `${baseUrl}${path}`, lastModified: milestoneDate, priority: path.startsWith("/newsroom/") ? 0.7 : 0.6, changeFrequency: "monthly" as const })),
    ...nocapPlaceCategories.map((category) => ({ url: `${baseUrl}/categories/${category}`, priority: 0.75, changeFrequency: "weekly" as const })),
    ...getAllAreas().map((area) => ({ url: `${baseUrl}/areas/${area.slug}`, priority: 0.7, changeFrequency: "weekly" as const })),
    ...nocapPlaces.map((place) => ({ url: `${baseUrl}/places/${place.id}`, priority: 0.65, changeFrequency: "weekly" as const })),
  ];
}
