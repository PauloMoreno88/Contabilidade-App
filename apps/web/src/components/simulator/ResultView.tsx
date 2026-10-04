import Link from "next/link";
import { PLANS, type SimulatorAnswers, type SimulatorResult } from "@exactra/shared";
import { simulatorCopy } from "@/config/simulator";
import { formatBRL } from "@/lib/format";
import { Disclaimer } from "./Disclaimer";

const copy = simulatorCopy.result;

type Props = { answers: SimulatorAnswers; result: SimulatorResult; leadId?: string; onRestart: () => void };

export function ResultView({ answers, result, leadId, onRestart }: Props) {
  const plan = PLANS[result.recommendedPlan];
  const checkoutHref = `/checkout?plan=${plan.id}${leadId ? `&lead=${leadId}` : ""}`;
  const perMonth = <span className="text-[0.8em] text-faint">{copy.perMonth}</span>;

  return (
    <div>
      <div className="mb-0.5 text-[0.78rem] text-faint">{copy.label}</div>
      <h3 className="mb-[22px] text-[1.3rem] font-semibold">{copy.title}</h3>
      <dl className="mb-6 grid gap-[18px] sm:grid-cols-2">
        <Item label={copy.revenue}>
          <span className="font-mono">{formatBRL(answers.monthlyRevenue * 100)}</span>
          {perMonth}
        </Item>
        <Item label={copy.regime}>{result.suggestedRegime}</Item>
        <Item label={copy.taxes} wide>
          <span className="font-mono">
            {copy.range(formatBRL(result.estimatedTaxMinCents), formatBRL(result.estimatedTaxMaxCents))}
          </span>
          {perMonth}
        </Item>
        <Item label={copy.net} wide>
          <span className="font-mono text-[1.4rem] text-brand">{formatBRL(result.estimatedNetCents)}</span>
          {perMonth}
        </Item>
      </dl>
      <Disclaimer className="mb-[26px]" />

      <div className="rounded-[14px] border border-line bg-surface-2 p-5">
        <p className="mb-4 text-[0.95rem]">{copy.planText(plan.name)}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={checkoutHref} className="btn btn-primary">{copy.planCta}</Link>
          <Link href="#planos" className="btn btn-ghost">{copy.seePlans}</Link>
        </div>
      </div>
      <button type="button" onClick={onRestart} className="mt-5 text-[0.86rem] text-muted underline hover:text-ink">
        {copy.restart}
      </button>
    </div>
  );
}

function Item({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`border-t border-line pt-3 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[0.78rem] text-faint">{label}</dt>
      <dd className="mt-1 text-[1.15rem]">{children}</dd>
    </div>
  );
}
