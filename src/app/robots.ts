import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.nocapblr.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/map",
          "/places/",
          "/categories/",
          "/areas/",
          "/about",
          "/what-nocap",
          "/guidelines",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/_next/",
          "/jobs/",
          "/opportunities/",
          "/pulse/",
          "/pain-points/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
