import type { MetadataRoute } from "next";
import { IS_STAGING, SITE_URL } from "@/config/env";

export const dynamic = "force-static";

/** Public pages only; the test environment lists nothing. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (IS_STAGING) return [];
  return ["", "/privacidade", "/termos"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
