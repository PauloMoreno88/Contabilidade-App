import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { BlogCta } from "@/components/blog/BlogCta";
import { PostBody } from "@/components/blog/PostBody";
import { PostCard } from "@/components/blog/PostCard";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { blogCategories, blogCopy } from "@/config/blog";
import { SITE_URL } from "@/config/env";
import { formatDate, getPost, getPosts, relatedPosts } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: `${post.title} | Blog Exactra`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      locale: "pt_BR",
      publishedTime: post.date,
      modifiedTime: post.updated,
      section: blogCategories[post.category].label,
      ...(post.image && { images: [{ url: post.image, width: 1200, height: 750, alt: post.imageAlt }] }),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const url = `${SITE_URL}/blog/${post.slug}`;
  const toc = post.blocks.flatMap((b) => (b.type === "h2" ? [b] : []));
  const related = relatedPosts(post);
  const category = blogCategories[post.category];

  const org = { "@type": "Organization", name: "Exactra Contabilidade", url: SITE_URL };
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated,
      inLanguage: "pt-BR",
      mainEntityOfPage: url,
      ...(post.image && { image: `${SITE_URL}${post.image}` }),
      articleSection: category.label,
      author: org,
      publisher: org,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: blogCopy.breadcrumbHome, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: blogCopy.breadcrumbBlog, item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
    ...(post.faq.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-surface">
      <Header />
      <main>
        <article>
          <header className="bg-surface-2 pb-10 pt-8 md:pb-14 md:pt-12">
            <div className="container-x">
              <nav aria-label="Trilha" className="mb-7 text-[0.88rem] text-faint">
                <ol className="flex flex-wrap items-center gap-1.5">
                  <li><Link href="/" className="hover:text-ink">{blogCopy.breadcrumbHome}</Link></li>
                  <li aria-hidden="true">/</li>
                  <li><Link href="/blog" className="hover:text-ink">{blogCopy.breadcrumbBlog}</Link></li>
                  <li aria-hidden="true">/</li>
                  <li className="text-muted">{category.label}</li>
                </ol>
              </nav>
              <span className="kicker">{category.label}</span>
              <h1 className="mt-3 max-w-[24ch] font-serif text-[clamp(2rem,4.2vw,3.1rem)] leading-[1.1] font-semibold tracking-[-0.01em]">
                {post.title}
              </h1>
              <p className="mt-4 max-w-[62ch] text-[1.12rem] text-muted">{post.description}</p>
              <p className="mt-6 flex flex-wrap gap-x-3 gap-y-1 text-[0.9rem] text-faint">
                <span className="font-semibold text-ink">{blogCopy.author}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={post.updated}>
                  {post.updated === post.date ? blogCopy.publishedLabel : blogCopy.updatedLabel} {formatDate(post.updated)}
                </time>
                <span aria-hidden="true">·</span>
                <span>{blogCopy.readingTime(post.readingMinutes)}</span>
              </p>
            </div>
          </header>

          {post.image && (
            <div className="container-x -mb-2 pt-8 md:pt-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt={post.imageAlt} className="aspect-[16/9] w-full rounded-2xl object-cover md:aspect-[21/8]" />
            </div>
          )}
          <div className="container-x grid gap-10 pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
            <div className="min-w-0 max-w-[720px]">
              <PostBody blocks={post.blocks} />
              <p role="note" className="mt-10 flex gap-2.5 rounded-xl border border-line bg-white p-4 text-[0.9rem] text-muted">
                <Info size={18} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
                {blogCopy.notice}
              </p>
              <Link href="/blog" className="mt-8 inline-flex items-center gap-2 font-semibold hover:text-brand">
                <ArrowLeft size={17} aria-hidden="true" />
                {blogCopy.backToBlog}
              </Link>
            </div>
            {toc.length > 2 && (
              <aside className="hidden lg:block">
                <nav aria-label={blogCopy.tocTitle} className="sticky top-28 rounded-2xl border border-line bg-white p-5">
                  <p className="mb-3 text-[0.82rem] font-bold uppercase tracking-[0.1em] text-faint">{blogCopy.tocTitle}</p>
                  <ol className="grid gap-2.5 text-[0.93rem]">
                    {toc.map((h) => (
                      <li key={h.id}><a href={`#${h.id}`} className="text-muted hover:text-brand">{h.text}</a></li>
                    ))}
                  </ol>
                  <a href={blogCopy.cta.simulate.href} className="btn btn-primary mt-5 w-full px-4 text-[0.9rem]">
                    {blogCopy.inlineCta.label}
                  </a>
                </nav>
              </aside>
            )}
          </div>
        </article>

        {related.length > 0 && (
          <section className="pt-16 md:pt-20">
            <div className="container-x">
              <h2 className="mb-7 font-serif text-[clamp(1.6rem,2.8vw,2.1rem)] font-semibold">{blogCopy.related}</h2>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => (
                  <li key={p.slug} className="grid"><PostCard post={p} /></li>
                ))}
              </ul>
            </div>
          </section>
        )}
        <BlogCta />
      </main>
      <Footer />
      <WhatsAppFloat />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
