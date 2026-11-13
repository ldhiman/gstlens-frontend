import type { MetadataRoute } from "next";
import { POPULAR_HSN_SAC_CODES } from "@/lib/hsnData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gstlens.in";
  const now = new Date();

  // Core static marketing and tool pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/free-invoice-generator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gst-calculator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hsn-code`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gst-info`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Programmatic HSN/SAC queries for search engines
  const hsnRoutes: MetadataRoute.Sitemap = POPULAR_HSN_SAC_CODES.map((item) => ({
    url: `${baseUrl}/hsn-code?q=${encodeURIComponent(item.code)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...hsnRoutes];
}
