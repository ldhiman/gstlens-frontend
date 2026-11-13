import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://gstlens.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/free-invoice-generator",
          "/gst-calculator",
          "/hsn-code",
          "/gst-info",
          "/gst-info/*",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/dashboard",
          "/invoices/*",
          "/purchases",
          "/gstr-1",
          "/gstr-2b",
          "/gstr-3b",
          "/settings",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
