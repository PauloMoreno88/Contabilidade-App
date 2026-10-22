import { Calculator, MessageCircle } from "lucide-react";
import { blogCopy } from "@/config/blog";
import { images, whatsappLink } from "@/config/site";

/** Closing call to action of the blog pages: back to the simulator on the landing. */
export function BlogCta() {
  const { cta } = blogCopy;
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[26px] px-6 py-10 text-white md:px-14 md:py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images.band.src} alt="" className="absolute inset-0 size-full object-cover object-[center_40%]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,33,51,.96)_0%,rgba(15,33,51,.8)_55%,rgba(15,33,51,.3)_100%)]" />
          <div className="relative">
            <h2 className="max-w-[20ch] font-serif text-[clamp(1.8rem,3.2vw,2.4rem)] leading-[1.12] font-semibold">{cta.title}</h2>
            <p className="mt-3 max-w-[46ch] text-[#d7e0e9]">{cta.text}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={cta.simulate.href} className="btn btn-primary">
                <Calculator size={18} aria-hidden="true" />
                {cta.simulate.label}
              </a>
              <a href={whatsappLink()} target="_blank" rel="noopener" className="btn btn-ghost-dark">
                <MessageCircle size={18} aria-hidden="true" />
                {cta.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Short card placed inside an article by a [[simulador]] line. */
export function InlineCta() {
  const { inlineCta, cta } = blogCopy;
  return (
    <aside className="my-9 flex flex-col gap-4 rounded-2xl bg-surface-2 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-serif text-[1.25rem] font-semibold">{inlineCta.title}</p>
        <p className="mt-1 text-[0.95rem] text-muted">{inlineCta.text}</p>
      </div>
      <a href={cta.simulate.href} className="btn btn-primary shrink-0">{inlineCta.label}</a>
    </aside>
  );
}
