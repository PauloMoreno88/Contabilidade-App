import type { MetadataRoute } from "next";
import { IS_STAGING, SITE_URL } from "@/config/env";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
