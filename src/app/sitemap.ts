import type { MetadataRoute } from "next";

import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fusionwa.com";

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  entries.push(
    {
      url: `${baseUrl}/saas`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/software-houses`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    }
  );

  if (PUBLIC_SIGNUP_ENABLED) {
    entries.push({
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    });
  }

  return entries;
}
