"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { CURRENT_PLAN, estimateRegimes, type SimulatorAnswers, type SimulatorResult } from "@exactra/shared";
import { simulatorCopy } from "@/config/simulator";
import { whatsappLink } from "@/config/site";
import { formatBRL } from "@/lib/format";

const copy = simulatorCopy.result;

type Props = { answers: SimulatorAnswers; result: SimulatorResult; lead?: { id: string; firstName: string } };

export function ResultView({ answers, result, lead }: Props) {
  // Bars grow from zero once mounted: the one motion that shows the comparison.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const revenueCents = Math.round(answers.monthlyRevenue * 100);
  const taxCents = result.estimatedTaxMinCents;
  // The API's result is the source of truth; older rule versions have no comparison, so fall back to the shared rules.
  const regimes = result.regimes ?? estimateRegimes(answers);
  const applicable = regimes.filter((r) => r.applicable);
  const max = Math.max(...regimes.map((r) => r.taxCents), 1);
  const worst = Math.max(...applicable.map((r) => r.taxCents));
  const yearlySaving = (worst - taxCents) * 12;
  const plan = CURRENT_PLAN;
  const checkoutHref = `/checkout?plan=${plan.id}${lead ? `&lead=${lead.id}` : ""}`;

  return (
    <div className="grid gap-[30px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <h3 className="font-serif text-[1.4rem] leading-[1.2] font-semibold md:text-[1.7rem]">{copy.title(lead?.firstName ?? "")}</h3>
        <p className="mb-[18px] mt-2 text-faint">{copy.sub}</p>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Kpi label={copy.revenue} value={formatBRL(revenueCents)} />
          <Kpi label={copy.taxes} value={formatBRL(taxCents)} />
          <Kpi label={copy.afterTax} value={formatBRL(result.estimatedNetCents)} good />
        </dl>
        <ul className="mt-[22px] grid gap-3.5">
          {regimes.map((r) => {
            const best = r.applicable && r.name === result.suggestedRegime;
            return (
              <li key={r.name} className={`grid grid-cols-[120px_minmax(0,1fr)_84px] items-center gap-3.5 text-[0.88rem] sm:grid-cols-[240px_minmax(0,1fr)_110px] sm:text-[0.95rem] ${r.applicable ? "" : "text-faint"}`}>
                <span>
                  {r.name}
                  {best && <span className="ml-1.5 whitespace-nowrap rounded-full bg-ok-tint px-2 py-0.5 text-[0.72rem] font-bold text-ok">{copy.best}</span>}
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-700 ease-out ${best ? "bg-ok" : "bg-[#9daebe]"}`}
                    style={{ width: grown && r.applicable ? `${Math.max(3, (r.taxCents / max) * 100)}%` : 0 }}
                  />
                </span>
                <span className={`text-right font-semibold tabular-nums ${best ? "text-ok" : ""}`}>
                  {r.applicable ? formatBRL(r.taxCents) : copy.notApplicable}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 rounded-xl bg-brand-tint px-4 py-3.5 text-[0.95rem]">
          {yearlySaving > 0 ? copy.saving(formatBRL(yearlySaving)) : copy.close}
        </p>
      </div>

      <div className="rounded-[18px] bg-navy p-[26px] text-on-navy">
        {result.needsQuote ? (
          <>
            <small className="text-on-navy-faint">{copy.quoteLabel}</small>
            <p className="mt-1 font-serif text-[2rem] leading-tight font-semibold text-white">{copy.quoteTitle}</p>
            <p className="mt-2.5">{copy.quoteText}</p>
          </>
        ) : (
          <>
            <small className="text-on-navy-faint">{copy.netLabel}</small>
            <p className="mt-1 font-serif text-[2.2rem] leading-tight font-semibold text-white tabular-nums">
              {formatBRL(result.estimatedNetCents - plan.monthlyPriceCents)}
            </p>
            <p className="mt-2">{copy.netExplain(formatBRL(plan.monthlyPriceCents), plan.name)}</p>
          </>
        )}
        <ul className="mt-3.5 grid gap-2">
          {plan.features.slice(0, 4).map((f) => (
            <li key={f} className="flex gap-2.5">
              <Check size={18} className="mt-[3px] shrink-0 text-[#7fd3a4]" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        {result.needsQuote ? (
          <a href={whatsappLink(copy.quoteWhatsapp)} target="_blank" rel="noopener" className="btn btn-primary mt-[18px] w-full">
            {copy.quoteCta}
          </a>
        ) : (
          <Link href={checkoutHref} className="btn btn-primary mt-[18px] w-full">{copy.planCta(plan.name)}</Link>
        )}
        <a href={whatsappLink(copy.reviewWhatsapp)} target="_blank" rel="noopener" className="btn btn-ghost-dark mt-2.5 w-full">
          <MessageCircle size={18} aria-hidden="true" />
          {copy.review}
        </a>
      </div>
    </div>
  );
}

function Kpi({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={`rounded-[14px] p-4 ${good ? "bg-ok-tint" : "bg-surface-2"}`}>
      <dt className="text-[0.84rem] text-faint">{label}</dt>
      <dd className={`mt-1 font-serif text-[1.7rem] font-semibold tabular-nums ${good ? "text-ok" : ""}`}>{value}</dd>
    </div>
  );
}
