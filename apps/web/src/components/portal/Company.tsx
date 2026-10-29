"use client";

import { Loading } from "@/components/common/Loading";
import { feedbackCopy } from "@/config/feedback";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, ShieldCheck } from "lucide-react";
import { whatsappLink, type CompanyProfile, type PortalCompany } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { useLoad } from "@/components/admin/useLoad";
import { api } from "@/lib/api";
import { formatDocument } from "@/lib/format";
import { usePortal } from "./PortalShell";
import { emptyProfile, ProfileFields } from "./ProfileFields";
import { LoadState, PageHeader, Panel } from "./ui";

const copy = portalCopy.company;

export function Company() {
  const company = useLoad(() => api.company(), []);
  return (
    <>
      {company.data && company.loading && <Loading compact label={feedbackCopy.updating} />}
      <PageHeader title={copy.title} lede={copy.lede} />
      {!company.data ? <LoadState error={company.error} onRetry={company.reload} /> : <CompanyView c={company.data} />}
    </>
  );
}

type Save = "idle" | "saving" | "saved" | "error";

function SaveButton({ state, disabled }: { state: Save; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button type="submit" className="btn btn-navy px-5 py-2.5 text-[0.9rem]" aria-busy={state === "saving"} disabled={disabled || state === "saving"}>{copy.save}</button>
      <span role="status" className={`text-[0.86rem] ${state === "error" ? "text-brand" : "text-ok"}`}>
        {state === "saved" ? copy.saved : state === "error" ? copy.saveError : ""}
      </span>
    </div>
  );
}

function CompanyView({ c }: { c: PortalCompany }) {
  const { me, writable } = usePortal();
  const [phone, setPhone] = useState(c.phone);
  // Last phone saved, so typing the previous one back after a save can be saved too.
  const [savedPhone, setSavedPhone] = useState(c.phone);
  const [profile, setProfile] = useState<CompanyProfile>(c.profile ?? emptyProfile);
  const [phoneState, setPhoneState] = useState<Save>("idle");
  const [profileState, setProfileState] = useState<Save>("idle");
  useEffect(() => setPhoneState("idle"), [phone]);
  useEffect(() => setProfileState("idle"), [profile]);

  async function save(input: Parameters<typeof api.updateCompany>[0], set: (s: Save) => void) {
    set("saving");
    try {
      await api.updateCompany(input);
      set("saved");
      return true;
    } catch {
      set("error");
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title={copy.data}>
        <form
          className="px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            save({ phone }, setPhoneState).then((ok) => ok && setSavedPhone(phone));
          }}
        >
          <dl className="grid gap-4 text-[0.92rem] sm:grid-cols-2">
            <div>
              <dt className="text-[0.8rem] text-faint">{copy.name}</dt>
              <dd className="font-medium">{c.name}</dd>
            </div>
            <div>
              <dt className="text-[0.8rem] text-faint">{copy.document}</dt>
              <dd className="font-medium tabular-nums">{formatDocument(c.document)}</dd>
            </div>
            <div>
              <dt className="text-[0.8rem] text-faint">{copy.email}</dt>
              <dd className="break-all font-medium">{c.email}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.8rem] text-faint">{copy.lockedNote}</p>
          <label htmlFor="phone" className="mb-1.5 mt-5 block text-[0.86rem] text-muted">{copy.phone}</label>
          <div className="flex flex-wrap items-center gap-3">
            <input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} minLength={10} maxLength={20} disabled={!writable} className="field-input max-w-[260px] bg-surface" />
            {writable && <SaveButton state={phoneState} disabled={phone === savedPhone} />}
          </div>
        </form>
      </Panel>

      <Panel title={copy.profile}>
        <form
          className="px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            save({ profile }, setProfileState);
          }}
        >
          <p className="mb-5 text-[0.88rem] text-muted">{copy.profileText}</p>
          <fieldset disabled={!writable}>
            <ProfileFields value={profile} onChange={setProfile} />
          </fieldset>
          {writable && <div className="mt-6"><SaveButton state={profileState} /></div>}
        </form>
      </Panel>

      <Panel title={copy.users}>
        <ul>
          {c.members.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5 text-[0.92rem] last:border-b-0">
              <span>
                <span className="font-medium">{m.name}</span>
                {m.you && <span className="text-faint"> ({copy.you})</span>}
                <span className="block text-[0.84rem] text-muted">{m.email}</span>
              </span>
              <span className="text-[0.82rem] text-faint">{m.role === "OWNER" ? copy.owner : copy.member}</span>
            </li>
          ))}
        </ul>
        <a href={whatsappLink(copy.addUserMessage)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-t border-line px-5 py-3.5 text-[0.88rem] text-muted hover:text-ink">
          <MessageCircle size={16} aria-hidden="true" />
          {copy.addUser}
        </a>
      </Panel>

      <Link href="/app/empresa/seguranca" className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-muted">
        <ShieldCheck size={22} className={me.user.twoFactorEnabled ? "text-ok" : "text-navy-3"} aria-hidden="true" />
        <span className="flex-1">
          <span className="block font-semibold">{copy.security}</span>
          <span className="text-[0.86rem] text-muted">{copy.securityText}</span>
        </span>
        <ChevronRight size={18} className="text-faint" aria-hidden="true" />
      </Link>
      <p className="text-[0.82rem] text-faint">{copy.reminders(c.remindersEnabled)}</p>
    </div>
  );
}
