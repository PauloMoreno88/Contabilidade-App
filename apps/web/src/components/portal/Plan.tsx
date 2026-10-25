"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { CHECKOUT_PAYMENT_METHODS, PAYMENT_PROVIDERS, planInfo, PORTAL_RULES, whatsappLink, type CheckoutPaymentMethod, type PaymentProviderId, type PortalContract, type PortalPlan } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { providerLabels } from "@/config/checkout";
import { useLoad } from "@/components/admin/useLoad";
import { api } from "@/lib/api";
import { formatBRLExact, formatDate } from "@/lib/format";
import { LoadState, PageHeader } from "./ui";

const copy = portalCopy.plan;
const terms = portalCopy.onboarding;
const DAY = 86_400_000;

export function Plan() {
  const plan = useLoad(() => api.plan(), []);
  const canceled = useSearchParams().get("cancelado") === "1";
  return (
    <>
      <PageHeader title={copy.title} lede={copy.lede} />
      {canceled && <p className="mb-5 rounded-xl bg-surface-2 px-4 py-3 text-[0.9rem]">{copy.canceled}</p>}
      {!plan.data ? <LoadState error={plan.error} onRetry={plan.reload} /> : <PlanView p={plan.data} />}
    </>
  );
}

function PlanView({ p }: { p: PortalPlan }) {
  const now = Date.now();
  const started = p.contracts.filter((c) => c.startsAt);
  // Newest first: a paid renewal (starts in the future) comes before the current contract.
  const current = started.find((c) => Date.parse(c.startsAt!) <= now && (c.status === "ACTIVE" || c.status === "PAST_DUE")) ?? started[0];
  const next = started.find((c) => c !== current && Date.parse(c.startsAt!) > now && c.status === "ACTIVE");
  const history = started.filter((c) => c !== current && c !== next);

  return (
    <div className="flex flex-col gap-5">
      {current && <ContractCard c={current} title={copy.current} />}
      {next && <ContractCard c={next} title={copy.next} />}
      {!next && <Renew p={p} />}
      {history.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-3.5 font-semibold">{copy.history}</h2>
          <ul>
            {history.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-line px-5 py-3 text-[0.9rem] last:border-b-0">
                <span>{formatDate(c.startsAt)} a {formatDate(c.endsAt)}</span>
                <span className="tabular-nums text-muted">{formatBRLExact(c.amountCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <a href={whatsappLink(copy.helpMessage)} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 text-[0.9rem] text-muted underline-offset-4 hover:text-ink hover:underline">
        <MessageCircle size={16} aria-hidden="true" />
        {copy.help}
      </a>
    </div>
  );
}

function ContractCard({ c, title }: { c: PortalContract; title: string }) {
  const start = Date.parse(c.startsAt!);
  const end = c.endsAt ? Date.parse(c.endsAt) : null;
  const elapsed = end ? Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) : 0;
  const daysLeft = end ? Math.ceil((end - Date.now()) / DAY) : null;

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-[0.88rem] text-muted">{planInfo(c.plan).name}</span>
      </div>
      <div className="px-5 py-5">
        <p className="text-[0.8rem] text-faint">{copy.validity}</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-serif text-[1.45rem] font-semibold tabular-nums">
            {formatDate(c.startsAt)} a {formatDate(c.endsAt)}
          </p>
          {daysLeft !== null && Date.now() >= start && (
            <p className={`text-[0.9rem] font-medium ${daysLeft <= PORTAL_RULES.renewWindowDays ? "text-brand" : "text-muted"}`}>{copy.daysLeft(daysLeft)}</p>
          )}
        </div>
        {/* Time line of the contract: how much of the year has gone by. */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <div className="h-full rounded-full bg-navy" style={{ width: `${elapsed * 100}%` }} />
        </div>
        <dl className="mt-5 grid gap-4 text-[0.9rem] sm:grid-cols-2">
          <div>
            <dt className="text-[0.8rem] text-faint">{copy.method}</dt>
            <dd className="font-medium">{c.source === "MANUAL" ? copy.manual : copy.methods[c.method]}</dd>
          </div>
          {c.amountCents > 0 && (
            <div>
              <dt className="text-[0.8rem] text-faint">{copy.amount}</dt>
              <dd className="font-medium tabular-nums">{formatBRLExact(c.amountCents)}</dd>
            </div>
          )}
        </dl>
      </div>
      {c.source === "CHECKOUT" && (
        <div className="border-t border-line px-5 py-4">
          <h3 className="mb-2 text-[0.88rem] font-semibold">{copy.payments}</h3>
          {c.payments.length === 0 ? (
            <p className="text-[0.88rem] text-muted">{copy.noPayments}</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-[0.88rem]">
              {c.payments.map((pay) => (
                <li key={pay.id} className="flex flex-wrap justify-between gap-2">
                  <span>{formatDate(pay.paidAt ?? pay.createdAt)}, {copy.methods[pay.method]}</span>
                  <span className="tabular-nums">
                    {formatBRLExact(pay.amountCents)} <span className={pay.status === "PAID" ? "text-ok" : "text-muted"}>{copy.paymentStatus[pay.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Renew({ p }: { p: PortalPlan }) {
  const [method, setMethod] = useState<CheckoutPaymentMethod>("PIX");
  const [provider, setProvider] = useState<PaymentProviderId>("STRIPE");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!p.canRenew) {
    const opens = p.access.endsAt ? new Date(Date.parse(p.access.endsAt) - PORTAL_RULES.renewWindowDays * DAY).toISOString() : null;
    return opens ? <p className="text-[0.9rem] text-muted">{copy.renewClosed(formatDate(opens))}</p> : null;
  }

  async function renew() {
    setBusy(true);
    setError(false);
    try {
      const { checkoutUrl } = await api.renew({ method: provider === "MERCADO_PAGO" ? "CARD" : method, provider, consent: true });
      window.location.href = checkoutUrl;
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-navy bg-surface p-5">
      <h2 className="font-serif text-[1.35rem] font-semibold">{copy.renewTitle}</h2>
      <p className="mt-1 text-[0.92rem] text-muted">{copy.renewText}</p>
      <fieldset className="mt-5">
        <legend className="mb-2 text-[0.88rem] font-semibold">{copy.renewProvider}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_PROVIDERS.map((p) => (
            <label key={p} className="cursor-pointer rounded-xl border border-line px-4 py-3 font-medium has-[:checked]:border-navy has-[:checked]:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} className="sr-only" />
              {providerLabels[p].label}
            </label>
          ))}
        </div>
      </fieldset>
      {provider === "MERCADO_PAGO" ? <p className="mt-5 text-[0.88rem] text-muted">{copy.renewMercadoPago}</p> : (
      <fieldset className="mt-5">
        <legend className="mb-2 text-[0.88rem] font-semibold">{copy.renewMethod}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CHECKOUT_PAYMENT_METHODS.map((m) => (
            <label key={m} className="cursor-pointer rounded-xl border border-line px-4 py-3 font-medium has-[:checked]:border-navy has-[:checked]:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
              {copy.methods[m]}
            </label>
          ))}
        </div>
      </fieldset>
      )}
      <label className="mt-5 flex items-start gap-3 text-[0.88rem]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
        <span>
          {terms.terms} <Link href="/termos" target="_blank" className="underline">{terms.termsLink}</Link> {terms.and}{" "}
          <Link href="/privacidade" target="_blank" className="underline">{terms.privacyLink}</Link>.
        </span>
      </label>
      {error && <p role="alert" className="mt-4 text-[0.88rem] text-brand">{copy.renewError}</p>}
      <button type="button" onClick={renew} disabled={!consent || busy} className="btn btn-primary mt-5">{copy.renewCta}</button>
    </section>
  );
}
