import Link from "next/link";
import { Check } from "lucide-react";
import { CURRENT_PLAN } from "@exactra/shared";
import { planSection as copy } from "@/config/site";
import { formatBRL } from "@/lib/format";

/** The single plan (docs/plano.md, decision 20): navy summary on the left, what is included on the right. */
export function PlanCard() {
  const plan = CURRENT_PLAN;
  return (
    <section id="plano" className="pb-16 pt-16 md:pb-24 lg:pt-[150px]">
      <div className="container-x">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <span className="kicker">{copy.kicker}</span>
          <h2 className="section-title">{copy.title}</h2>
          <p className="mx-auto mt-3.5 max-w-[58ch] text-[1.08rem] text-muted">{copy.sub}</p>
        </div>

        <div className="mx-auto grid max-w-[1000px] overflow-hidden rounded-[26px] border-[1.5px] border-line md:grid-cols-[minmax(0,.9fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col bg-navy px-[22px] py-7 text-white md:p-10">
            <span className="self-start rounded-full bg-brand px-3 py-[5px] text-[0.8rem] font-bold">{copy.tag}</span>
            <h3 className="mt-[18px] font-serif text-[2.2rem] font-semibold">{plan.name}</h3>
            <p className="mt-2 text-on-navy">{plan.tagline}.</p>
            <p className="mt-7 font-serif text-[3.6rem] leading-none font-semibold tabular-nums">
              {formatBRL(plan.monthlyPriceCents)}
              <small className="font-sans text-[1.05rem] font-medium text-on-navy-faint"> {copy.perMonth}</small>
            </p>
            <p className="mt-3 text-[0.92rem] text-on-navy">{copy.prepaidNote}</p>
            <Link href={`/checkout?plan=${plan.id}`} className="btn btn-primary mt-7 w-full">{copy.cta}</Link>
            <a href={copy.simulate.href} className="mt-3.5 text-center text-[0.93rem] font-semibold underline underline-offset-4">
              {copy.simulate.label}
            </a>
          </div>
          <div className="px-[22px] py-7 md:p-10">
            <h4 className="mb-[18px] text-[1.05rem] font-bold">{copy.includedTitle}</h4>
            <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check size={18} className="mt-[3px] shrink-0 text-ok" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-[26px] border-t border-line pt-[18px] text-[0.93rem] text-muted">
              {copy.quote.text}{" "}
              <a href="#contato" className="underline">{copy.quote.link}</a>.
            </p>
          </div>
        </div>

        <ul className="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[0.93rem] text-muted">
          {copy.payment.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>
    </section>
  );
}
