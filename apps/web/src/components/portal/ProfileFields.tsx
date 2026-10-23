"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ACTIVITIES, type CompanyProfile } from "@exactra/shared";
import { portalCopy } from "@/config/portal";

const copy = portalCopy.profile;
export const emptyProfile: CompanyProfile = { activity: "servicos", hasEmployees: false, banks: [] };

/** Company profile form (onboarding and "Empresa e acesso"). Controlled: the parent saves. */
export function ProfileFields({ value, onChange }: { value: CompanyProfile; onChange: (p: CompanyProfile) => void }) {
  const [bank, setBank] = useState("");
  const set = (p: Partial<CompanyProfile>) => onChange({ ...value, ...p });
  const addBank = () => {
    const b = bank.trim();
    if (b && !value.banks.includes(b) && value.banks.length < 10) set({ banks: [...value.banks, b] });
    setBank("");
  };

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-[0.92rem] font-semibold">{copy.activity}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACTIVITIES.map((a) => (
            <label
              key={a}
              className="cursor-pointer rounded-xl border border-line bg-surface p-3.5 transition-colors has-[:checked]:border-navy has-[:checked]:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
            >
              <input type="radio" name="activity" value={a} checked={value.activity === a} onChange={() => set({ activity: a })} className="sr-only" />
              <span className="block font-semibold">{copy.activities[a].label}</span>
              <span className="mt-0.5 block text-[0.82rem] text-muted">{copy.activities[a].text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[0.92rem] font-semibold">{copy.employees}</legend>
        <div className="inline-flex rounded-full bg-surface-2 p-1">
          {([true, false] as const).map((v) => (
            <label key={String(v)} className="cursor-pointer rounded-full px-5 py-2 text-[0.9rem] font-medium text-muted has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-[0_1px_2px_rgba(15,33,51,0.12)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="radio" name="employees" checked={value.hasEmployees === v} onChange={() => set({ hasEmployees: v })} className="sr-only" />
              {v ? copy.yes : copy.no}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="bank" className="mb-1 block text-[0.92rem] font-semibold">{copy.banks}</label>
        <p className="mb-2 text-[0.82rem] text-faint">{copy.banksHint}</p>
        <div className="flex gap-2">
          <input
            id="bank"
            value={bank}
            maxLength={60}
            onChange={(e) => setBank(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBank();
              }
            }}
            className="field-input bg-surface"
          />
          <button type="button" onClick={addBank} className="btn btn-ghost shrink-0 px-4 py-2 text-[0.88rem]">{copy.addBank}</button>
        </div>
        {value.banks.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {value.banks.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-[0.86rem]">
                {b}
                <button type="button" onClick={() => set({ banks: value.banks.filter((x) => x !== b) })} aria-label={copy.removeBank(b)} className="grid size-6 place-items-center rounded-full hover:bg-surface-3">
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="invoiceSystem" className="mb-2 block text-[0.92rem] font-semibold">{copy.invoiceSystem}</label>
        <input
          id="invoiceSystem"
          value={value.invoiceSystem ?? ""}
          maxLength={120}
          placeholder={copy.invoicePlaceholder}
          onChange={(e) => set({ invoiceSystem: e.target.value || undefined })}
          className="field-input bg-surface"
        />
      </div>
    </div>
  );
}
