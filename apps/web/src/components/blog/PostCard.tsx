import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogCategories, blogCopy } from "@/config/blog";
import type { PostMeta } from "@/lib/blog";
import { Cover } from "./Cover";

export function PostCard({ post, featured = false }: { post: PostMeta; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group grid overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,33,51,.35)] ${featured ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}
    >
      <Cover category={post.category} image={post.image} alt={post.imageAlt} large={featured} />
      <div className={`flex flex-col gap-2.5 p-5 md:p-6 ${featured ? "lg:justify-center lg:p-10" : ""}`}>
        <p className="flex flex-wrap items-center gap-x-2.5 text-[0.82rem] font-semibold text-faint">
          {featured && <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-brand">{blogCopy.featured}</span>}
          <span className="text-brand">{blogCategories[post.category].label}</span>
          <span aria-hidden="true">·</span>
          <span>{blogCopy.readingTime(post.readingMinutes)}</span>
        </p>
        <h3 className={`font-serif font-semibold leading-[1.2] ${featured ? "text-[clamp(1.5rem,2.6vw,2.1rem)]" : "text-[1.25rem]"}`}>
          {post.title}
        </h3>
        <p className={`text-muted ${featured ? "text-[1.02rem]" : "line-clamp-3 text-[0.95rem]"}`}>{post.description}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[0.92rem] font-semibold text-ink">
          {blogCopy.readMore}
          <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
