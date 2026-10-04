"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { createLeadSchema, PLANS, type SimulatorAnswers, type SimulatorResult } from "@exactra/shared";
import { simulatorCopy } from "@/config/simulator";
import { api } from "@/lib/api";
import { readUtm } from "@/lib/utm";
import { Disclaimer } from "./Disclaimer";

const copy = simulatorCopy.gate;
type Field = keyof typeof copy.errors;

type Props = {
  answers: SimulatorAnswers;
  result: SimulatorResult;
  /** Receives the lead id and the result recomputed by the API (source of truth). */
  onUnlocked: (leadId: string, result: SimulatorResult) => void;
};

/** Light gate: shows a preview, unlocks the detailed values after name + WhatsApp + consent. */
export function LeadGate({ answers, result, onUnlocked }: Props) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const parsed = createLeadSchema.safeParse({
      name: String(form.get("name") ?? "").trim(),
      whatsapp: String(form.get("whatsapp") ?? "").replace(/\D/g, ""),
      email: email || undefined,
      answers,
      result,
      utm: readUtm(),
      consent: form.get("consent") === "on",
    });

    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field;
        if (key in copy.errors) next[key] = copy.errors[key];
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSending(true);
    try {
      const res = await api.createLead(parsed.data);
      onUnlocked(res.id, res.result);
    } catch {
      setErrors({ request: copy.errors.request });
      setSending(false);
    }
  }

  return (
    <div>
      <h3 className="mb-5 text-[1.3rem] font-semibold">{copy.title}</h3>
      <dl className="mb-6 grid gap-[18px] sm:grid-cols-2">
        <div className="border-t border-line pt-3">
          <dt className="text-[0.78rem] text-faint">{copy.regimeLabel}</dt>
          <dd className="mt-1 text-[1.05rem]">{result.suggestedRegime}</dd>
        </div>
        <div className="border-t border-line pt-3">
          <dt className="text-[0.78rem] text-faint">{copy.planLabel}</dt>
          <dd className="mt-1 text-[1.05rem]">{PLANS[result.recommendedPlan].name}</dd>
        </div>
      </dl>

      <form onSubmit={submit} onInput={() => setErrors({})} noValidate className="rounded-[14px] border border-line bg-surface p-5">
        <p className="mb-4 flex items-center gap-2 text-[0.92rem]">
          <Lock size={16} className="shrink-0 text-brand" aria-hidden="true" />
          {copy.lockedText}
        </p>
        <TextField name="name" label={copy.name} placeholder={copy.namePlaceholder} autoComplete="name" error={errors.name} />
        <TextField name="whatsapp" label={copy.whatsapp} placeholder={copy.whatsappPlaceholder} type="tel" autoComplete="tel" inputMode="tel" error={errors.whatsapp} />
        <TextField name="email" label={copy.email} placeholder={copy.emailPlaceholder} type="email" autoComplete="email" error={errors.email} />

        <label className="mb-1 mt-2 flex items-start gap-2.5 text-[0.84rem] text-muted">
          <input type="checkbox" name="consent" className="mt-1 size-4 shrink-0 accent-brand" aria-invalid={!!errors.consent} />
          <span>
            {copy.consent}{" "}
            <Link href={copy.consentLink.href} target="_blank" className="underline hover:text-ink">{copy.consentLink.label}</Link>.
          </span>
        </label>
        {errors.consent && <p className="mb-2 text-[0.8rem] text-brand">{errors.consent}</p>}
        {errors.request && <p role="alert" className="mt-3 text-[0.85rem] text-brand">{errors.request}</p>}

        <button type="submit" className="btn btn-primary mt-4 w-full" disabled={sending}>
          {sending ? copy.submitting : copy.submit}
        </button>
      </form>
      <Disclaimer className="mt-5" />
    </div>
  );
}

function TextField({ name, label, error, ...rest }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label htmlFor={`lead-${name}`} className="mb-1.5 block text-[0.82rem] text-muted">{label}</label>
      <input
        id={`lead-${name}`}
        name={name}
        className="field-input"
        aria-invalid={!!error}
        aria-describedby={error ? `lead-${name}-error` : undefined}
        {...rest}
      />
      {error && <p id={`lead-${name}-error`} className="mt-1 text-[0.8rem] text-brand">{error}</p>}
    </div>
  );
}
