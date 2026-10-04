import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_IDS, PLANS } from "@exactra/shared";
import { plansSection } from "@/config/site";
import { formatBRL } from "@/lib/format";
import { SectionHead } from "./SectionHead";

export function Plans() {
  return (
    <section id="planos" className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={plansSection.title} sub={plansSection.sub} />
        <ul className="grid items-stretch gap-5 md:grid-cols-3">
          {PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const featured = plan.highlighted;
            return (
              <li
                key={id}
                className={`flex flex-col rounded-[14px] border px-[26px] py-[30px] ${
                  featured
                    ? "-order-1 border-brand bg-surface-2 shadow-[inset_0_0_0_1px_rgba(200,35,51,0.25),0_24px_48px_-28px_rgba(200,35,51,0.2)] md:order-none md:-translate-y-1.5"
                    : "border-line bg-surface"
                }`}
              >
                <h3 className="mb-0.5 mt-2 text-[1.1rem] font-semibold">{plan.name}</h3>
                <div className="mb-5 text-[0.86rem] text-muted">{plan.tagline}</div>
                <div className="mb-1 font-mono text-[2rem] font-semibold tabular-nums">
                  {formatBRL(plan.monthlyPriceCents)}
                  <span className="text-[0.9rem] font-normal text-faint">{plansSection.perMonth}</span>
                </div>
                <ul className="mb-[26px] mt-[22px] flex grow flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.9rem] text-muted">
                      <Check className="mt-[3px] shrink-0 text-brand" size={16} strokeWidth={1.8} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={`/checkout?plan=${id}`} className={`btn w-full ${featured ? "btn-primary" : "btn-ghost"}`}>
                  {plansSection.cta}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-[0.86rem] text-faint">{plansSection.prepaidNote}</p>
      </div>
    </section>
  );
}
