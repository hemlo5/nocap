import type { MetadataRoute } from "next";
import { nocapPlaces, nocapPlaceCategories, getAllAreas } from "@/lib/nocap/places";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.nocapblr.com";
  const now = new Date();

  // Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/what-is-nocap`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guidelines`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Category hub pages
  const categoryPages: MetadataRoute.Sitemap = nocapPlaceCategories.map((category) => ({
    url: `${baseUrl}/categories/${category}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  // Area / neighborhood hub pages
  const areas = getAllAreas();
  const areaPages: MetadataRoute.Sitemap = areas.map((area) => ({
    url: `${baseUrl}/areas/${area.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Individual place pages
  const placePages: MetadataRoute.Sitemap = nocapPlaces.map((place) => ({
    url: `${baseUrl}/places/${place.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [...staticPages, ...categoryPages, ...areaPages, ...placePages];
}

