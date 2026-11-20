"use client";

import { useState } from "react";
import { blogCategories, blogCopy, type BlogCategoryId } from "@/config/blog";
import type { PostMeta } from "@/lib/blog";
import { PostCard } from "./PostCard";

/** Featured article plus a grid, filtered by category on the client (static export). */
export function BlogList({ posts }: { posts: PostMeta[] }) {
  const [category, setCategory] = useState<BlogCategoryId | null>(null);
  const used = (Object.keys(blogCategories) as BlogCategoryId[]).filter((c) => posts.some((p) => p.category === c));
  const shown = category ? posts.filter((p) => p.category === category) : posts;
  const [first, ...rest] = shown;

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-[0.9rem] font-semibold transition ${active ? "border-navy bg-navy text-white" : "border-line bg-white text-muted hover:border-muted hover:text-ink"}`;

  return (
    <>
      <div role="group" aria-label={blogCopy.filterLabel} className="mb-9 flex flex-wrap gap-2">
        <button type="button" aria-pressed={!category} className={chip(!category)} onClick={() => setCategory(null)}>
          {blogCopy.all}
        </button>
        {used.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} className={chip(category === c)} onClick={() => setCategory(c)}>
            {blogCategories[c].label}
          </button>
        ))}
      </div>
      {first && (
        <div className="grid gap-6">
          {!category && <PostCard post={first} featured />}
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(category ? shown : rest).map((p) => (
              <li key={p.slug} className="grid">
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
