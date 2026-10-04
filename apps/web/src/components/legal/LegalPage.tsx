import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { legalCopy, type LegalDoc } from "@/config/legal";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";

export function LegalPage({ doc, other }: { doc: LegalDoc; other: { href: string; label: string } }) {
  return (
    <>
      <Header />
      <main className="container-x pb-20 pt-[116px] md:pt-[140px]">
        <article className="max-w-[680px]">
          <p role="note" className="mb-8 flex gap-2.5 rounded-[14px] border border-brand/40 bg-brand/5 p-4 text-[0.9rem]">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            {legalCopy.draftNotice}
          </p>
          <h1 className="text-[clamp(1.8rem,3.4vw,2.4rem)] font-semibold tracking-tight">{doc.title}</h1>
          <p className="mt-2 text-[0.84rem] text-faint">
            {legalCopy.updatedLabel}: {doc.updatedAt}
          </p>
          <p className="mt-6 text-muted">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.title} className="mt-9">
              <h2 className="mb-3 text-[1.15rem] font-semibold">{s.title}</h2>
              {s.paragraphs?.map((p) => <p key={p} className="mb-3 text-muted">{p}</p>)}
              {s.items && (
                <ul className="list-disc space-y-2 pl-5 text-muted marker:text-brand">
                  {s.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              )}
            </section>
          ))}
          <Link href={other.href} className="mt-10 inline-block text-[0.92rem] underline hover:text-brand">{other.label}</Link>
        </article>
      </main>
      <Footer />
    </>
  );
}
