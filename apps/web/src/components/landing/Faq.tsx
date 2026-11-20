import { Minus, Plus } from "lucide-react";
import { faq } from "@/config/site";

export function Faq() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.3fr)] lg:gap-14">
        <div>
          <span className="kicker">{faq.kicker}</span>
          <h2 className="section-title">{faq.title}</h2>
          <p className="mt-3.5 text-[1.08rem] text-muted">
            <a href="#contato" className="underline">{faq.sub}</a>
          </p>
        </div>
        <div>
          {faq.items.map((f, i) => (
            <details key={f.q} name="faq" open={i === 0} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-[1.06rem] font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="mt-1 shrink-0 text-brand group-open:hidden" size={18} aria-hidden="true" />
                <Minus className="mt-1 hidden shrink-0 text-brand group-open:block" size={18} aria-hidden="true" />
              </summary>
              <p className="max-w-[64ch] pb-5 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
