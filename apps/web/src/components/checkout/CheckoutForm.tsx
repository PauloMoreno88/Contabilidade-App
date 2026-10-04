"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import {
  allowedPeriods,
  createCheckoutSchema,
  PERIOD_DISCOUNT,
  PAYMENT_METHODS,
  PERIOD_MONTHS,
  PLAN_IDS,
  PLANS,
  PRICES_ARE_PLACEHOLDER,
  totalPriceCents,
  type BillingPeriod,
  type PaymentMethod,
  type PlanId,
} from "@exactra/shared";
import { CHECKOUT_ENABLED, checkoutCopy as copy, methodLabels, periodLabels } from "@/config/checkout";
import { whatsappLink } from "@/config/site";
import { api } from "@/lib/api";
import { formatBRL, formatBRLExact } from "@/lib/format";
import { ChoiceGroup } from "./ChoiceGroup";

type Field = keyof typeof copy.errors;

const isPlan = (v: string | null): v is PlanId => PLAN_IDS.includes(v as PlanId);

export function CheckoutForm() {
  const params = useSearchParams();
  const initialPlan = params.get("plan");
  const leadId = params.get("lead") ?? undefined;

  const [plan, setPlan] = useState<PlanId>(isPlan(initialPlan) ? initialPlan : "profissional");
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);

  const total = totalPriceCents(plan, period);
  const months = PERIOD_MONTHS[period];

  function changeMethod(m: PaymentMethod) {
    setMethod(m);
    const periods = allowedPeriods(m);
    if (!periods.includes(period)) setPeriod(periods[periods.length - 1]);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const parsed = createCheckoutSchema.safeParse({
      plan,
      period,
      method,
      customer: {
        name: text("name"),
        email: text("email"),
        phone: text("phone").replace(/\D/g, ""),
        document: text("document").replace(/\D/g, ""),
      },
      leadId,
      consent: form.get("consent") === "on",
    });

    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.at(-1) as Field;
        if (key in copy.errors) next[key] = copy.errors[key];
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSending(true);
    try {
      const { checkoutUrl } = await api.createCheckout(parsed.data);
      window.location.assign(checkoutUrl);
    } catch {
      setErrors({ request: copy.errors.request });
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} onInput={() => setErrors({})} noValidate className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
      <div>
        <h1 className="mb-8 text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-tight">{copy.title}</h1>

        <ChoiceGroup
          name="plan"
          legend={copy.planTitle}
          value={plan}
          onChange={setPlan}
          options={PLAN_IDS.map((id) => ({
            value: id,
            label: PLANS[id].name,
            hint: PLANS[id].tagline,
            aside: `${formatBRL(PLANS[id].monthlyPriceCents)}/mês`,
          }))}
          columns={1}
        />

        <ChoiceGroup
          name="method"
          legend={copy.methodTitle}
          value={method}
          onChange={changeMethod}
          options={PAYMENT_METHODS.map((m) => ({ value: m, ...methodLabels[m] }))}
        />

        {method !== "CARD" && (
          <ChoiceGroup
            name="period"
            legend={copy.periodTitle}
            value={period}
            onChange={setPeriod}
            options={allowedPeriods(method).map((p) => ({
              value: p,
              label: periodLabels[p],
              hint: copy.discount(Math.round(PERIOD_DISCOUNT[p] * 100)),
              aside: formatBRL(totalPriceCents(plan, p)),
            }))}
          />
        )}

        <fieldset className="mb-6">
          <legend className="mb-3 text-[1.02rem] font-semibold">{copy.customerTitle}</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Input name="name" autoComplete="name" error={errors.name} />
            <Input name="email" type="email" autoComplete="email" error={errors.email} />
            <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" error={errors.phone} />
            <Input name="document" inputMode="numeric" error={errors.document} />
          </div>
          <label className="mt-2 flex items-start gap-2.5 text-[0.84rem] text-muted">
            <input type="checkbox" name="consent" className="mt-1 size-4 shrink-0 accent-brand" aria-invalid={!!errors.consent} />
            <span>
              {copy.consent} <Link href={copy.consentLink.href} className="underline hover:text-ink">{copy.consentLink.label}</Link>.
            </span>
          </label>
          {errors.consent && <p className="mt-1 text-[0.8rem] text-brand">{errors.consent}</p>}
        </fieldset>
      </div>

      <aside className="rounded-[20px] border border-line bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="mb-4 font-semibold">{copy.summaryTitle}</h2>
        <p className="text-[0.9rem] text-muted">
          {PLANS[plan].name}, {methodLabels[method].label.toLowerCase()}
          {method !== "CARD" && `, ${periodLabels[period]}`}
        </p>
        <div className="mt-4 border-t border-line pt-4">
          <div className="text-[0.78rem] text-faint">{copy.totalNow}</div>
          <div className="mt-1 font-mono text-[1.9rem] font-semibold tabular-nums">{formatBRLExact(total)}</div>
          {months > 1 && <div className="text-[0.84rem] text-muted">{copy.perMonthEquivalent(formatBRLExact(Math.round(total / months)))}</div>}
          <p className="mt-3 text-[0.84rem] text-muted">{method === "CARD" ? copy.recurring : copy.prepaid(months)}</p>
        </div>

        {CHECKOUT_ENABLED ? (
          <>
            {errors.request && <p role="alert" className="mt-4 text-[0.85rem] text-brand">{errors.request}</p>}
            <button type="submit" className="btn btn-primary mt-5 w-full" disabled={sending}>
              {sending ? copy.submitting : copy.submit}
            </button>
          </>
        ) : (
          <div className="mt-5 rounded-lg bg-surface-2 p-4">
            <p className="font-medium">{copy.disabled.title}</p>
            <p className="mb-3 mt-1 text-[0.84rem] text-muted">{copy.disabled.text}</p>
            <a href={whatsappLink(copy.disabled.whatsappText(PLANS[plan].name))} target="_blank" rel="noopener" className="btn btn-wa w-full">
              {copy.disabled.cta}
            </a>
          </div>
        )}

        <p className="mt-4 flex gap-2 text-[0.78rem] text-faint">
          <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
          {copy.secureNote}
        </p>
        {PRICES_ARE_PLACEHOLDER && <p className="mt-2 text-[0.78rem] text-faint">{copy.placeholderNote}</p>}
      </aside>
    </form>
  );
}

function Input({ name, error, ...rest }: { name: keyof typeof copy.fields; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const f = copy.fields[name];
  return (
    <div className="mb-4">
      <label htmlFor={`co-${name}`} className="mb-1.5 block text-[0.82rem] text-muted">{f.label}</label>
      <input
        id={`co-${name}`}
        name={name}
        placeholder={f.placeholder}
        className="field-input"
        aria-invalid={!!error}
        aria-describedby={error ? `co-${name}-error` : undefined}
        {...rest}
      />
      {error && <p id={`co-${name}-error`} className="mt-1 text-[0.8rem] text-brand">{error}</p>}
    </div>
  );
}
