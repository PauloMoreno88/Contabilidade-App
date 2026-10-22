"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createLeadSchema, type SimulatorAnswers, type SimulatorResult } from "@exactra/shared";
import { simulatorCopy } from "@/config/simulator";
import { api } from "@/lib/api";
import { readUtm } from "@/lib/utm";

const copy = simulatorCopy.gate;
type Field = keyof typeof copy.errors;

/** The submit button lives in the card footer and targets this form by id. */
export const LEAD_FORM_ID = "lead-form";

type Props = {
  answers: SimulatorAnswers;
  result: SimulatorResult;
  onSending: (sending: boolean) => void;
  /** Receives the lead id, the visitor's first name and the result recomputed by the API (source of truth). */
  onUnlocked: (leadId: string, firstName: string, result: SimulatorResult) => void;
};

/** Light gate: shows a preview, unlocks the values after name + WhatsApp + consent. */
export function LeadGate({ answers, result, onSending, onUnlocked }: Props) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const parsed = createLeadSchema.safeParse({
      name,
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
    onSending(true);
    try {
      const res = await api.createLead(parsed.data);
      onUnlocked(res.id, name.split(/\s+/)[0], res.result);
    } catch {
      setErrors({ request: copy.errors.request });
    } finally {
      onSending(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.6fr)] md:gap-9">
      <div>
        <h3 className="font-serif text-[1.4rem] leading-[1.2] font-semibold md:text-[1.7rem]">{copy.title}</h3>
        <p className="mt-2 text-faint">{copy.text}</p>
        <dl className="mt-[18px] overflow-hidden rounded-[14px] border border-line">
          <Row label={copy.regimeLabel}>{result.suggestedRegime}</Row>
          <Row label={copy.taxLabel} hidden>{copy.hidden}</Row>
          <Row label={copy.netLabel} hidden>{copy.hidden}</Row>
        </dl>
      </div>

      <form id={LEAD_FORM_ID} onSubmit={submit} onInput={() => setErrors({})} noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField name="name" label={copy.name} placeholder={copy.namePlaceholder} autoComplete="name" error={errors.name} />
          <TextField name="whatsapp" label={copy.whatsapp} placeholder={copy.whatsappPlaceholder} type="tel" autoComplete="tel" inputMode="tel" error={errors.whatsapp} />
        </div>
        <div className="mt-3.5">
          <TextField name="email" label={copy.email} placeholder={copy.emailPlaceholder} type="email" autoComplete="email" error={errors.email} />
        </div>
        <label className="mt-3.5 flex items-start gap-2.5 text-[0.85rem] leading-[1.45] text-muted">
          <input type="checkbox" name="consent" className="mt-0.5 size-[17px] shrink-0 accent-brand" aria-invalid={!!errors.consent} />
          <span>
            {copy.consent}{" "}
            <Link href={copy.consentLink.href} target="_blank" className="underline hover:text-ink">{copy.consentLink.label}</Link>.
          </span>
        </label>
        {errors.consent && <p className="mt-1.5 text-[0.82rem] text-brand">{errors.consent}</p>}
        {errors.request && <p role="alert" className="mt-3 text-[0.88rem] text-brand">{errors.request}</p>}
      </form>
    </div>
  );
}

function Row({ label, hidden, children }: { label: string; hidden?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <dt className="text-faint">{label}</dt>
      <dd className={`text-right font-semibold ${hidden ? "select-none blur-[7px]" : ""}`} aria-hidden={hidden}>{children}</dd>
    </div>
  );
}

function TextField({ name, label, error, ...rest }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={`lead-${name}`} className="text-[0.88rem] font-semibold">{label}</label>
      <input
        id={`lead-${name}`}
        name={name}
        className="w-full rounded-[10px] border-[1.5px] border-line bg-white px-3.5 py-[13px] focus:border-navy focus:outline-none"
        aria-invalid={!!error}
        aria-describedby={error ? `lead-${name}-error` : undefined}
        {...rest}
      />
      {error && <p id={`lead-${name}-error`} className="text-[0.82rem] text-brand">{error}</p>}
    </div>
  );
}
