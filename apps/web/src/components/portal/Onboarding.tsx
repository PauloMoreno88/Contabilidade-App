"use client";

import { AsyncButton } from "@/components/common/AsyncButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { competenceLabel, type CompanyProfile, type DocumentsMonth } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { Brand } from "@/components/landing/Brand";
import { api } from "@/lib/api";
import { formatDay, formatDocument } from "@/lib/format";
import { usePortal } from "./PortalShell";
import { emptyProfile, ProfileFields } from "./ProfileFields";
import { firstName } from "./ui";

const copy = portalCopy.onboarding;

/** First access: confirm data and terms, describe the company (skippable), see the first month's list. */
export function Onboarding() {
  const router = useRouter();
  const { me, reload } = usePortal();
  const company = me.company!;
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState(company.phone);
  const [terms, setTerms] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile);
  const [month, setMonth] = useState<DocumentsMonth | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save(withProfile: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      await api.onboarding({ phone, acceptTerms: true, profile: withProfile ? profile : undefined });
      setMonth(await api.documents());
      setStep(2);
    } catch {
      setError(copy.error);
    }
    setBusy(false);
  }

  async function finish(to: string) {
    await reload();
    router.replace(to);
  }

  const s = copy.steps[step];
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-[640px] items-center justify-between px-4 py-5 sm:px-6">
        <Brand href="/app" />
        <p className="text-[0.84rem] text-faint">{copy.step(step + 1, copy.steps.length)}</p>
      </header>
      <main className="mx-auto max-w-[640px] px-4 pb-16 sm:px-6">
        {/* Progress: the three steps of the first access */}
        <ol className="mb-8 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {copy.steps.map((_, i) => (
            <li key={i} className={`h-1 rounded-full ${i <= step ? "bg-navy" : "bg-surface-3"}`} />
          ))}
        </ol>
        {step === 0 && <p className="mb-1 text-[0.95rem] text-muted">{copy.welcome(firstName(me.user.name))}</p>}
        <h1 className="font-serif text-[clamp(1.8rem,5vw,2.3rem)] font-semibold leading-[1.1] tracking-[-0.015em]">{s.title}</h1>
        <p className="mt-2 max-w-[54ch] text-muted">{s.text}</p>

        {step === 0 && (
          <form
            className="mt-7"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setStep(1);
            }}
          >
            <dl className="mb-5 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              <div className="bg-surface p-4">
                <dt className="text-[0.8rem] text-faint">{portalCopy.company.name}</dt>
                <dd className="font-semibold">{company.name}</dd>
              </div>
              <div className="bg-surface p-4">
                <dt className="text-[0.8rem] text-faint">{portalCopy.company.document}</dt>
                <dd className="font-semibold tabular-nums">{formatDocument(company.document)}</dd>
              </div>
            </dl>
            <label htmlFor="phone" className="mb-1.5 block text-[0.86rem] text-muted">{portalCopy.company.phone}</label>
            <input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} minLength={10} maxLength={20} required className="field-input bg-surface" />
            <p className="mt-2 text-[0.8rem] text-faint">{portalCopy.company.lockedNote}</p>
            <label className="mt-6 flex items-start gap-3 text-[0.9rem]">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required className="mt-0.5 size-4 accent-brand" />
              <span>
                {copy.terms}{" "}
                <Link href="/termos" target="_blank" className="underline">{copy.termsLink}</Link> {copy.and}{" "}
                <Link href="/privacidade" target="_blank" className="underline">{copy.privacyLink}</Link>.
              </span>
            </label>
            <button type="submit" className="btn btn-primary mt-7 w-full sm:w-auto" disabled={!terms || phone.replace(/\D/g, "").length < 10}>{copy.next}</button>
          </form>
        )}

        {step === 1 && (
          <div className="mt-7">
            <ProfileFields value={profile} onChange={setProfile} />
            {error && <p role="alert" className="mt-5 text-[0.88rem] text-brand">{error}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => save(true)} aria-busy={busy} disabled={busy} className="btn btn-primary">{copy.next}</button>
              <button type="button" onClick={() => save(false)} aria-busy={busy} disabled={busy} className="btn btn-ghost">{copy.skip}</button>
              <button type="button" disabled={busy} onClick={() => setStep(0)} className="ml-auto text-[0.88rem] text-muted underline">{copy.back}</button>
            </div>
          </div>
        )}

        {step === 2 && month && (
          <div className="mt-7">
            <section className="rounded-2xl border border-line bg-surface">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
                <h2 className="font-semibold first-letter:uppercase">{competenceLabel(month.competence)}</h2>
                <p className="text-[0.84rem] text-muted">{portalCopy.documents.due(formatDay(month.dueDate), 1)}</p>
              </div>
              <ul>
                {month.requests.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                    <span className="mt-1 size-4 shrink-0 rounded-full border-2 border-dashed border-surface-3" aria-hidden="true" />
                    <span>
                      <span className="block font-medium">{r.title}</span>
                      <span className="text-[0.8rem] text-faint">{r.required ? portalCopy.documents.required : portalCopy.documents.optional}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <ul className="mt-6 flex flex-col gap-2.5 text-[0.92rem] text-muted">
              {copy.howItWorks.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <AsyncButton type="button" onClick={() => finish("/app/documentos")} className="btn btn-primary">{copy.sendNow}</AsyncButton>
              <AsyncButton type="button" onClick={() => finish("/app")} className="btn btn-ghost">{copy.finish}</AsyncButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
