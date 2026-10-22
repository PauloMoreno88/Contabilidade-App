import type { SimulatorAnswers } from "@exactra/shared";
import type { SimulatorStep } from "@/config/simulator";

type Choice = Extract<SimulatorStep, { kind: "choice" }>;
type Value = SimulatorAnswers[keyof SimulatorAnswers];

type Props = { step: Choice; selected: Value | undefined; onChoose: (value: Value) => void };

/** Question on the left, option cards with an icon on the right. */
export function ChoiceStep({ step, selected, onChoose }: Props) {
  return (
    <fieldset className="grid gap-6 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.6fr)] md:gap-9">
      <div>
        <legend className="font-serif text-[1.4rem] leading-[1.2] font-semibold md:text-[1.7rem]">{step.question}</legend>
        <p className="mt-2 text-faint">{step.help}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
        {step.options.map((o) => {
          const isSelected = selected === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.label}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChoose(o.value)}
              className={`flex flex-col items-start gap-2.5 rounded-[14px] border-[1.5px] p-[13px] text-left font-semibold transition-colors sm:p-4 ${
                isSelected ? "border-brand bg-brand-tint" : "border-line bg-white hover:border-faint"
              }`}
            >
              <Icon size={22} className="text-brand" aria-hidden="true" />
              <span>
                {o.label}
                <small className="mt-1 block text-[0.85rem] leading-[1.35] font-normal text-faint">{o.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
