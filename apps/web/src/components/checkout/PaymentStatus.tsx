"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { PLANS, type ContractStatusResponse } from "@exactra/shared";
import { methodLabels, periodLabels, statusCopy as copy } from "@/config/checkout";
import { whatsappLink } from "@/config/site";
import { api } from "@/lib/api";

const POLL_MS = 4000;
const MAX_POLLS = 30; // ponytail: ~2 min of polling, then the visitor reloads or waits for the e-mail

/**
 * Landing page after Stripe. Shows what the API says (activation only happens
 * via verified webhook), never assumes success from the redirect itself.
 */
export function PaymentStatus() {
  const params = useSearchParams();
  const contractId = params.get("contract");
  const token = params.get("token");
  const [data, setData] = useState<ContractStatusResponse | null>(null);
  const [missing, setMissing] = useState(!contractId || !token);

  useEffect(() => {
    if (!contractId || !token) return;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    async function tick() {
      try {
        const res = await api.getContractStatus(contractId!, token!);
        if (stopped) return;
        setData(res);
        // Boleto takes days; no point polling it.
        if (res.status === "PENDING_PAYMENT" && res.method !== "BOLETO" && ++polls < MAX_POLLS) {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch {
        if (!stopped) setMissing(true);
      }
    }
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [contractId, token]);

  if (missing) {
    return <StatusCard icon={<XCircle className="text-brand" />} title={copy.missing.title} text={copy.missing.text} />;
  }

  if (!data) {
    return (
      <StatusCard icon={<Loader2 className="animate-spin text-faint motion-reduce:animate-none" />} title={copy.loading} />
    );
  }

  const summary = copy.summary(PLANS[data.plan].name, periodLabels[data.period], methodLabels[data.method].label);

  if (data.status === "ACTIVE") {
    return (
      <StatusCard icon={<CheckCircle2 className="text-wa-dark" />} title={copy.active.title} text={copy.active.text} summary={summary}>
        <a href={whatsappLink(copy.whatsappText)} target="_blank" rel="noopener" className="btn btn-wa w-full">{copy.whatsapp}</a>
        <Link href="/#onboarding" className="btn btn-ghost w-full">{copy.nextSteps}</Link>
      </StatusCard>
    );
  }

  if (data.status === "PENDING_PAYMENT") {
    const p = copy.pending[data.method];
    return (
      <StatusCard icon={<Clock className="text-brand" />} title={p.title} text={p.text} summary={summary}>
        <a href={whatsappLink()} target="_blank" rel="noopener" className="btn btn-ghost w-full">{copy.whatsapp}</a>
      </StatusCard>
    );
  }

  return (
    <StatusCard icon={<XCircle className="text-brand" />} title={copy.failed.title} text={copy.failed.text} summary={summary}>
      <Link href={`/checkout?plan=${data.plan}`} className="btn btn-primary w-full">{copy.failed.retry}</Link>
      <a href={whatsappLink()} target="_blank" rel="noopener" className="btn btn-ghost w-full">{copy.whatsapp}</a>
    </StatusCard>
  );
}

function StatusCard({
  icon,
  title,
  text,
  summary,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  summary?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[480px] rounded-[20px] border border-line bg-surface p-8 text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-5 grid size-[52px] place-items-center rounded-full bg-surface-2 [&>svg]:size-7">{icon}</div>
      <h1 className="mb-2 text-[1.4rem] font-semibold">{title}</h1>
      {text && <p className="text-[0.94rem] text-muted">{text}</p>}
      {summary && <p className="mt-4 text-[0.84rem] text-faint">{summary}</p>}
      {children && <div className="mt-7 flex flex-col gap-2.5">{children}</div>}
    </div>
  );
}
