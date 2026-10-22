"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { calculateSimulation, simulatorAnswersSchema, type SimulatorAnswers, type SimulatorResult } from "@exactra/shared";
import { revenueInput, simulatorCopy as copy, simulatorSteps as steps } from "@/config/simulator";
import { ChoiceStep } from "./ChoiceStep";
import { Disclaimer } from "./Disclaimer";
import { LEAD_FORM_ID, LeadGate } from "./LeadGate";
import { ResultView } from "./ResultView";
import { RevenueStep } from "./RevenueStep";

type Phase = "steps" | "gate" | "result";
type Simulation = { answers: SimulatorAnswers; result: SimulatorResult };

// Motion that answers the visitor's click: the next screen slides in.
const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

const initialAnswers: Partial<SimulatorAnswers> = { monthlyRevenue: revenueInput.initial };

/** Simulator card that overlaps the bottom of the hero. */
export function Simulator() {
  const [phase, setPhase] = useState<Phase>("steps");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<SimulatorAnswers>>(initialAnswers);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [lead, setLead] = useState<{ id: string; firstName: string }>();
  const [sending, setSending] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const answered = answers[current.key] !== undefined;

  function next() {
    if (!isLast) return setStep(step + 1);
    const parsed = simulatorAnswersSchema.parse(answers);
    setSimulation({ answers: parsed, result: calculateSimulation(parsed) });
    setPhase("gate");
  }

  function choose(value: SimulatorAnswers[keyof SimulatorAnswers]) {
    setAnswers({ ...answers, [current.key]: value });
    // Fewer clicks: a choice moves on by itself, except on the last question.
    if (!isLast) setTimeout(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 240);
  }

  function restart() {
    setAnswers(initialAnswers);
    setStep(0);
    setSimulation(null);
    setPhase("steps");
  }

  const progress =
    phase === "steps"
      ? { label: copy.stepOf(step + 1, steps.length), pct: ((step + 1) / (steps.length + 1)) * 100 }
      : { label: phase === "gate" ? copy.lastStep : copy.resultStep, pct: 100 };

  return (
    <section id="simulador" className="relative z-10 -mt-[120px] scroll-mt-24 md:-mt-[150px]">
      <div className="container-x">
        <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_rgba(15,33,51,.22),0_2px_6px_rgba(15,33,51,.06)]">
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-b border-line px-[18px] py-5 sm:px-[30px]">
            <h2 className="font-serif text-[1.35rem] font-semibold">{copy.title}</h2>
            <span className="rounded-full bg-ok-tint px-2.5 py-1 text-[0.8rem] font-bold text-ok">{copy.badge}</span>
            <span className="w-full text-[0.9rem] text-faint sm:ml-auto sm:w-auto">{progress.label}</span>
          </div>
          <div
            className="h-1 bg-surface-2"
            role="progressbar"
            aria-label={copy.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.pct)}
          >
            <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress.pct}%` }} />
          </div>

          <div className="min-h-[250px] px-[18px] py-[30px] sm:px-[30px]" aria-live="polite">
            <MotionConfig reducedMotion="user">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={phase === "steps" ? `step-${step}` : phase} {...slide}>
                  {phase === "steps" && current.kind === "choice" && (
                    <ChoiceStep step={current} selected={answers[current.key]} onChoose={choose} />
                  )}
                  {phase === "steps" && current.kind === "revenue" && (
                    <RevenueStep
                      step={current}
                      value={answers.monthlyRevenue ?? revenueInput.initial}
                      onChange={(v) => setAnswers({ ...answers, monthlyRevenue: v })}
                    />
                  )}
                  {phase === "gate" && simulation && (
                    <LeadGate
                      answers={simulation.answers}
                      result={simulation.result}
                      onSending={setSending}
                      onUnlocked={(id, firstName, serverResult) => {
                        setLead({ id, firstName });
                        setSimulation({ answers: simulation.answers, result: serverResult });
                        setPhase("result");
                      }}
                    />
                  )}
                  {phase === "result" && simulation && (
                    <ResultView answers={simulation.answers} result={simulation.result} lead={lead} />
                  )}
                </motion.div>
              </AnimatePresence>
            </MotionConfig>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-surface-2 px-[18px] py-[18px] sm:px-[30px]">
            <span className="flex max-w-[62ch] items-center gap-2 text-[0.85rem] text-faint">
              <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
              <Disclaimer />
            </span>
            <div className="flex w-full items-center justify-end gap-3 sm:ml-auto sm:w-auto">
              {phase === "steps" && (
                <>
                  {step > 0 && (
                    <button type="button" className="px-1 py-2 font-semibold text-muted hover:text-ink" onClick={() => setStep(step - 1)}>
                      {copy.back}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary flex-1 sm:flex-none" disabled={!answered} onClick={next}>
                    {isLast ? copy.finish : copy.next}
                  </button>
                </>
              )}
              {phase === "gate" && (
                <>
                  <button type="button" className="px-1 py-2 font-semibold text-muted hover:text-ink" onClick={() => setPhase("steps")}>
                    {copy.back}
                  </button>
                  <button type="submit" form={LEAD_FORM_ID} className="btn btn-primary flex-1 sm:flex-none" disabled={sending}>
                    {sending ? copy.gate.submitting : copy.gate.submit}
                  </button>
                </>
              )}
              {phase === "result" && (
                <button type="button" className="px-1 py-2 font-semibold text-muted hover:text-ink" onClick={restart}>
                  {copy.result.restart}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
