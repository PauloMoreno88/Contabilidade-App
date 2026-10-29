"use client";

import { AsyncButton } from "@/components/common/AsyncButton";
import { Loading } from "@/components/common/Loading";
import { feedbackCopy } from "@/config/feedback";
import { LoadState } from "@/components/portal/ui";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  ACTIVITIES,
  addMonthsToCompetence,
  competenceLabel,
  currentDocumentsCompetence,
  daysUntil,
  documentsDueDate,
  itemStarted,
  type ChecklistItem,
  type UpsertChecklistItemInput,
} from "@exactra/shared";
import { adminPortalCopy } from "@/config/admin-portal";
import { api } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { useLoad } from "../useLoad";

const copy = adminPortalCopy.checklist;

const appliesText = (i: ChecklistItem) => {
  const parts = [
    i.appliesTo.activities?.length ? i.appliesTo.activities.map((a) => copy.activities[a]).join(" ou ") : null,
    i.appliesTo.hasEmployees === true ? copy.employees.yes : i.appliesTo.hasEmployees === false ? copy.employees.no : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : copy.appliesAll;
};

/** Item that only starts in a later competence: "A partir de março de 2027". */
export const startsLater = (i: ChecklistItem) =>
  itemStarted(i.startsCompetence, currentDocumentsCompetence()) ? null : copy.startsFrom(competenceLabel(i.startsCompetence!));

/** "Vale a partir de": the open competence ("Agora") or one of the next six. Never a past one. */
export function StartPicker({ value, onChange }: { value: string; onChange: (competence: string) => void }) {
  const current = currentDocumentsCompetence();
  const options = Array.from({ length: 7 }, (_, n) => addMonthsToCompetence(current, n));
  const due = documentsDueDate(current);
  return (
    <div className="text-[0.88rem]">
      <label className="flex flex-wrap items-center gap-2">
        <span className="text-[0.82rem] text-muted">{copy.startsAt}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1">
          {options.map((c, n) => (
            <option key={c} value={c}>
              {n === 0 ? copy.startsNow(competenceLabel(c)) : n === 1 ? copy.startsNext(competenceLabel(c)) : competenceLabel(c)}
            </option>
          ))}
        </select>
      </label>
      {value === current && (
        <p className="mt-1.5 text-[0.8rem] text-muted">
          {copy.nowNote}
          {daysUntil(due) < 0 && ` ${copy.lateNote(formatDay(due))}`}
        </p>
      )}
    </div>
  );
}

/** Monthly checklist templates. New items start now or in a chosen month; text changes apply to the next checklist (requests keep their text). */
export function ChecklistTemplates() {
  const items = useLoad(() => api.adminChecklistItems(), []);
  const [editing, setEditing] = useState<ChecklistItem | "new" | null>(null);

  return (
    <section className="max-w-[880px]">
      {items.data && items.loading && <Loading compact label={feedbackCopy.updating} />}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.3rem] font-semibold">{copy.title}</h1>
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary px-4 py-2 text-[0.88rem]">
          <Plus size={16} aria-hidden="true" />
          {copy.add}
        </button>
      </div>
      <p className="mb-5 max-w-[72ch] text-[0.88rem] text-muted">{copy.lede}</p>
      {editing === "new" && <ItemForm onDone={() => { setEditing(null); items.reload(); }} />}
      {!items.data ? (
        <LoadState error={items.error} onRetry={items.reload} />
      ) : (
        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {items.data.map((i) =>
            editing !== "new" && editing?.id === i.id ? (
              <li key={i.id} className="border-b border-line p-4 last:border-b-0">
                <ItemForm item={i} onDone={() => { setEditing(null); items.reload(); }} />
              </li>
            ) : (
              <li key={i.id} className={`flex flex-wrap items-start gap-x-4 gap-y-1 border-b border-line px-4 py-3.5 text-[0.88rem] last:border-b-0 ${i.active ? "" : "text-faint"}`}>
                <span className="w-8 shrink-0 tabular-nums text-faint">{i.sortOrder}</span>
                <span className="min-w-[240px] flex-1">
                  <span className="font-semibold">{i.title}</span>
                  {i.description && <span className="block text-[0.82rem] text-muted">{i.description}</span>}
                  <span className="mt-1 block text-[0.78rem] text-faint">
                    {copy.appliesTo}: {appliesText(i)}
                    {startsLater(i) && `. ${startsLater(i)}`}
                  </span>
                </span>
                <span className="text-[0.82rem]">{i.required ? copy.required : copy.optional}</span>
                <span className="text-[0.82rem]">{i.active ? copy.active : copy.inactive}</span>
                <button type="button" className="underline" onClick={() => setEditing(i)}>{copy.edit}</button>
                <AsyncButton
                  type="button"
                  className="underline"
                  onClick={async () => {
                    await api.adminUpdateChecklistItem(i.id, { active: !i.active }).catch(() => undefined);
                    items.reload();
                  }}
                >
                  {i.active ? copy.deactivate : copy.activate}
                </AsyncButton>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function ItemForm({ item, onDone }: { item?: ChecklistItem; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  // Items already in effect keep their start; new or not yet started ones can choose it.
  const pickStart = !item || !itemStarted(item.startsCompetence, currentDocumentsCompetence());
  const [start, setStart] = useState(item?.startsCompetence ?? addMonthsToCompetence(currentDocumentsCompetence(), 1));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const activities = ACTIVITIES.filter((a) => f.get(`act-${a}`) === "on");
    const emp = String(f.get("employees"));
    const input: UpsertChecklistItemInput = {
      title: String(f.get("title")).trim(),
      description: String(f.get("description")).trim() || null,
      required: f.get("required") === "on",
      sortOrder: Number(f.get("sortOrder")) || 100,
      appliesTo: { ...(activities.length && activities.length < 3 ? { activities } : {}), ...(emp === "any" ? {} : { hasEmployees: emp === "yes" }) },
      ...(pickStart ? { startsCompetence: start } : {}),
    };
    setBusy(true);
    await (item ? api.adminUpdateChecklistItem(item.id, input) : api.adminCreateChecklistItem(input)).catch(() => undefined);
    onDone();
  }
  const emp = item?.appliesTo.hasEmployees === true ? "yes" : item?.appliesTo.hasEmployees === false ? "no" : "any";
  return (
    <form onSubmit={submit} className="mb-4 grid gap-3 rounded-[14px] border border-navy/30 bg-surface p-4 sm:grid-cols-[1fr_100px]">
      <label className="block">
        <span className="mb-1 block text-[0.82rem] text-muted">{copy.itemTitle}</span>
        <input name="title" defaultValue={item?.title} required minLength={2} maxLength={120} className="field-input bg-surface" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[0.82rem] text-muted">{copy.order}</span>
        <input name="sortOrder" type="number" min={0} max={1000} defaultValue={item?.sortOrder ?? 100} className="field-input bg-surface" />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-[0.82rem] text-muted">{copy.description}</span>
        <input name="description" defaultValue={item?.description ?? ""} maxLength={300} className="field-input bg-surface" />
      </label>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-[0.88rem] sm:col-span-2">
        <legend className="mb-1 text-[0.82rem] text-muted">{copy.appliesTo}</legend>
        {ACTIVITIES.map((a) => (
          <label key={a} className="flex items-center gap-2">
            <input type="checkbox" name={`act-${a}`} defaultChecked={!item?.appliesTo.activities?.length || item.appliesTo.activities.includes(a)} className="accent-brand" />
            {copy.activities[a]}
          </label>
        ))}
        <select name="employees" defaultValue={emp} className="rounded-lg border border-line bg-surface px-2 py-1">
          {(["any", "yes", "no"] as const).map((k) => <option key={k} value={k}>{copy.employees[k]}</option>)}
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="required" defaultChecked={item?.required ?? true} className="accent-brand" />
          {copy.required}
        </label>
      </fieldset>
      {pickStart && (
        <div className="sm:col-span-2">
          <StartPicker value={start} onChange={setStart} />
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" aria-busy={busy} disabled={busy} className="btn btn-navy px-4 py-2 text-[0.88rem]">{copy.save}</button>
        <button type="button" onClick={onDone} className="btn btn-ghost px-4 py-2 text-[0.88rem]">{copy.cancel}</button>
      </div>
    </form>
  );
}
