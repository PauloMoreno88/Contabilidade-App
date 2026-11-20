import type { MetadataRoute } from "next";
import { IS_STAGING, SITE_URL } from "@/config/env";
import { getPosts } from "@/lib/blog";

export const dynamic = "force-static";

/** Public pages only; the test environment lists nothing. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (IS_STAGING) return [];
  const pages = ["", "/blog", "/privacidade", "/termos"].map((path) => ({ url: `${SITE_URL}${path}` }));
  const posts = getPosts().map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updated }));
  return [...pages, ...posts];
}
