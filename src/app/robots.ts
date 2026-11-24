import type { MetadataRoute } from "next";

// A prototype with sample data: keep it out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
