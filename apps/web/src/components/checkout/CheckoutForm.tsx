"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FlaskConical, Info, ShieldCheck } from "lucide-react";
import {
  CONTRACT_PERIOD,
  createCheckoutSchema,
  CURRENT_PLAN,
  installmentCents,
  PAYMENT_METHODS,
  PRICES_ARE_PLACEHOLDER,
  totalPriceCents,
  type PaymentMethod,
} from "@exactra/shared";
import { CHECKOUT_ENABLED, checkoutCopy as copy, methodLabels } from "@/config/checkout";
import { IS_STAGING, stagingCopy } from "@/config/env";
import { whatsappLink } from "@/config/site";
import { api } from "@/lib/api";
import { formatBRL, formatBRLExact } from "@/lib/format";
import { ChoiceGroup } from "./ChoiceGroup";

type Field = keyof typeof copy.errors;

export function CheckoutForm() {
  const params = useSearchParams();
  const leadId = params.get("lead") ?? undefined;
  const canceled = params.get("cancelado") === "1";

  // A single plan on sale (docs/plano.md, decision 20); ?plan= in old links is ignored.
  const plan = CURRENT_PLAN;
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);

  // One-year contract paid upfront (docs/plano.md, decision 22): the price is the same for every method.
  const total = totalPriceCents(plan.id);
  const installments = plan.maxInstallments > 1 && method === "CARD";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const parsed = createCheckoutSchema.safeParse({
      plan: plan.id,
      period: CONTRACT_PERIOD,
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
        {canceled && (
          <div role="status" className="mb-8 flex gap-3 rounded-[14px] border border-line bg-surface-2 p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="font-medium">{copy.canceled.title}</p>
              <p className="mt-1 text-[0.88rem] text-muted">{copy.canceled.text}</p>
            </div>
          </div>
        )}

        <section aria-labelledby="checkout-plan" className="mb-8">
          <h2 id="checkout-plan" className="mb-3 text-[1.02rem] font-semibold">{copy.planTitle}</h2>
          <div className="flex items-center justify-between gap-4 rounded-[14px] border border-line bg-surface p-4">
            <div>
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-0.5 text-[0.86rem] text-muted">{plan.tagline}</p>
            </div>
            <p className="shrink-0 text-right font-semibold tabular-nums">
              {formatBRL(total)}
              <span className="block text-[0.8rem] font-normal text-muted">{copy.perYear}</span>
            </p>
          </div>
        </section>

        <ChoiceGroup
          name="method"
          legend={copy.methodTitle}
          value={method}
          onChange={setMethod}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: methodLabels[m].label, hint: methodLabels[m].hint(plan.maxInstallments) }))}
        />

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
              {copy.consentStart}{" "}
              <Link href={copy.termsLink.href} target="_blank" className="underline hover:text-ink">{copy.termsLink.label}</Link>{" "}
              {copy.consent}{" "}
              <Link href={copy.consentLink.href} target="_blank" className="underline hover:text-ink">{copy.consentLink.label}</Link>.
            </span>
          </label>
          {errors.consent && <p className="mt-1 text-[0.8rem] text-brand">{errors.consent}</p>}
        </fieldset>
      </div>

      <aside className="rounded-[20px] border border-line bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="mb-4 font-semibold">{copy.summaryTitle}</h2>
        <p className="text-[0.9rem] text-muted">
          {plan.name}, {copy.contract.toLowerCase()}, {methodLabels[method].label.toLowerCase()}
        </p>
        <div className="mt-4 border-t border-line pt-4">
          <div className="text-[0.78rem] text-faint">{copy.totalNow}</div>
          <div className="mt-1 font-mono text-[1.9rem] font-semibold tabular-nums">{formatBRLExact(total)}</div>
          {installments && (
            <div className="text-[0.84rem] text-muted">{copy.installments(plan.maxInstallments, formatBRLExact(installmentCents(plan.id)))}</div>
          )}
          <p className="mt-3 text-[0.84rem] text-muted">{copy.annualNote}</p>
        </div>

        {IS_STAGING && <TestCards />}

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
            <a href={whatsappLink(copy.disabled.whatsappText(plan.name))} target="_blank" rel="noopener" className="btn btn-wa w-full">
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

/** Staging only: Stripe test-mode data, right where the visitor decides to pay. */
function TestCards() {
  const t = stagingCopy.checkout;
  return (
    <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-[0.84rem]">
      <p className="flex items-center gap-2 font-semibold">
        <FlaskConical size={16} className="shrink-0 text-amber-700" aria-hidden="true" />
        {t.title}
      </p>
      <p className="mb-2 mt-1 text-muted">{t.text}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {t.cards.map((c) => (
          <div key={c.number} className="contents">
            <dt className="text-muted">{c.label}</dt>
            <dd className="select-all font-mono tabular-nums">{c.number}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-muted">{t.details}</p>
      <p className="mt-1 text-muted">{t.other}</p>
    </div>
  );
}
