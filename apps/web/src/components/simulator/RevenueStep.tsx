import type { SimulatorStep } from "@/config/simulator";
import { revenueInput as input, simulatorCopy } from "@/config/simulator";
import { formatBRL } from "@/lib/format";

type Revenue = Extract<SimulatorStep, { kind: "revenue" }>;
type Props = { step: Revenue; value: number; onChange: (value: number) => void };

/** Monthly revenue: a large live number, a slider and a few shortcuts. */
export function RevenueStep({ step, value, onChange }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.6fr)] md:gap-9">
      <div>
        <h3 className="font-serif text-[1.4rem] leading-[1.2] font-semibold md:text-[1.7rem]">{step.question}</h3>
        <p className="mt-2 text-faint">{step.help}</p>
      </div>
      <div>
        <p className="font-serif text-[clamp(2.4rem,5vw,3.4rem)] leading-none font-semibold tabular-nums" aria-hidden="true">
          {formatBRL(value * 100)} <small className="font-sans text-base font-medium text-faint">{simulatorCopy.perMonth}</small>
        </p>
        <input
          type="range"
          min={input.min}
          max={input.max}
          step={input.step}
          value={Math.min(value, input.max)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={input.ariaLabel}
          aria-valuetext={formatBRL(value * 100)}
          className="mt-4 h-8 w-full accent-brand"
        />
        <div className="flex justify-between text-[0.82rem] text-faint">
          <span>{input.minLabel}</span>
          <span>{input.maxLabel}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {input.shortcuts.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={value === v}
              onClick={() => onChange(v)}
              className={`rounded-full border-[1.5px] px-3.5 py-[7px] text-[0.9rem] tabular-nums ${
                value === v ? "border-brand bg-brand-tint" : "border-line bg-white hover:border-faint"
              }`}
            >
              {formatBRL(v * 100)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
