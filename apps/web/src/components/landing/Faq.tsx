import { Plus } from "lucide-react";
import { faq } from "@/config/site";
import { SectionHead } from "./SectionHead";

export function Faq() {
  return (
    <section id="faq" className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={faq.title} />
        <div className="border-t border-line">
          {faq.items.map((f) => (
            <details key={f.q} name="faq" className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="shrink-0 text-faint transition-transform group-open:rotate-45" size={16} aria-hidden="true" />
              </summary>
              <p className="mb-5 max-w-[600px] text-[0.92rem] text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
