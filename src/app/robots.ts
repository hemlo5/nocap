import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://nocapblr.com";

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
          "/how-it-works",
          "/why-nocapblr",
          "/guides/",
          "/campaigns/",
          "/newsroom/",
          "/founder/",
          "/community-guidelines",
          "/moderation-policy",
          "/report-content",
          "/contact",
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
