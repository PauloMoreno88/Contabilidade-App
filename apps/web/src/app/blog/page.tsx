import type { Metadata } from "next";
import { BlogCta } from "@/components/blog/BlogCta";
import { BlogList } from "@/components/blog/BlogList";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { blogCopy } from "@/config/blog";
import { getPosts, toMeta } from "@/lib/blog";

export const metadata: Metadata = {
  title: blogCopy.seo.title,
  description: blogCopy.seo.description,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", title: blogCopy.seo.title, description: blogCopy.seo.description, url: "/blog", locale: "pt_BR" },
};

export default function BlogPage() {
  const posts = getPosts().map(toMeta);
  return (
    <div className="bg-surface">
      <Header />
      <main>
        <section className="bg-surface-2 pb-12 pt-12 md:pb-16 md:pt-16">
          <div className="container-x">
            <span className="kicker">{blogCopy.kicker}</span>
            <h1 className="section-title max-w-[20ch]">{blogCopy.title}</h1>
            <p className="mt-3.5 max-w-[58ch] text-[1.08rem] text-muted">{blogCopy.sub}</p>
          </div>
        </section>
        <section className="pt-10 md:pt-12">
          <div className="container-x">
            <BlogList posts={posts} />
          </div>
        </section>
        <BlogCta />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
