"use client";

import { useState } from "react";
import { calculateSimulation, simulatorAnswersSchema, type SimulatorAnswers, type SimulatorResult } from "@exactra/shared";
import { simulatorCopy as copy, simulatorSteps as steps } from "@/config/simulator";
import { SectionHead } from "@/components/landing/SectionHead";
import { LeadGate } from "./LeadGate";
import { ResultView } from "./ResultView";

type Phase = "start" | "steps" | "gate" | "result";

export function Simulator() {
  const [phase, setPhase] = useState<Phase>("start");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<SimulatorAnswers>>({});
  const [result, setResult] = useState<{ answers: SimulatorAnswers; result: SimulatorResult } | null>(null);
  const [leadId, setLeadId] = useState<string>();

  const current = steps[step];
  const selected = answers[current.key];
  const isLast = step === steps.length - 1;

  function next() {
    if (!isLast) return setStep(step + 1);
    const parsed = simulatorAnswersSchema.parse(answers);
    setResult({ answers: parsed, result: calculateSimulation(parsed) });
    setPhase("gate");
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setResult(null);
    setPhase("steps");
  }

  return (
    <section id="simulador" className="border-y border-line bg-surface py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={copy.title} sub={copy.sub} />
        <div className="max-w-[620px] rounded-[20px] border border-line bg-bg p-5 sm:p-10" aria-live="polite">
          {phase === "start" && (
            <div>
              <h3 className="text-[1.25rem] font-semibold">{copy.startTitle}</h3>
              <p className="mb-[26px] mt-2.5 max-w-[460px] text-muted">{copy.startText}</p>
              <button type="button" className="btn btn-primary" onClick={() => setPhase("steps")}>
                {copy.startCta}
              </button>
            </div>
          )}

          {phase === "steps" && (
            <div>
              <div className="mb-[22px] flex items-center justify-between text-[0.8rem] text-faint">
                <span>{copy.progressLabel}</span>
                <span className="font-mono">{copy.stepOf(step + 1, steps.length)}</span>
              </div>
              <div
                className="mb-[30px] h-1 overflow-hidden rounded bg-surface-3"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={steps.length}
                aria-valuenow={step + 1}
                aria-label={copy.progressLabel}
              >
                <div className="h-full rounded bg-brand transition-[width] duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
              </div>

              <fieldset>
                <legend className="mb-[18px] text-[1.25rem] font-semibold">{current.question}</legend>
                <div className="mb-[26px] flex flex-col gap-2.5">
                  {current.options.map((o) => {
                    const isSelected = selected === o.value;
                    return (
                      <button
                        key={o.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setAnswers({ ...answers, [current.key]: o.value })}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left text-[0.95rem] transition-colors ${
                          isSelected ? "border-brand bg-brand/5" : "border-line bg-surface hover:border-faint"
                        }`}
                      >
                        {o.label}
                        <span
                          aria-hidden="true"
                          className={`size-4 shrink-0 rounded-full border ${isSelected ? "border-brand bg-brand shadow-[inset_0_0_0_4px_#fff]" : "border-line"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  className={`btn btn-ghost text-muted ${step === 0 ? "invisible" : ""}`}
                  onClick={() => setStep(step - 1)}
                >
                  {copy.back}
                </button>
                <button type="button" className="btn btn-primary" disabled={selected === undefined} onClick={next}>
                  {isLast ? copy.finish : copy.next}
                </button>
              </div>
            </div>
          )}

          {phase === "gate" && result && (
            <LeadGate
              answers={result.answers}
              result={result.result}
              onUnlocked={(id) => {
                setLeadId(id);
                setPhase("result");
              }}
            />
          )}

          {phase === "result" && result && (
            <ResultView answers={result.answers} result={result.result} leadId={leadId} onRestart={restart} />
          )}
        </div>
      </div>
    </section>
  );
}
