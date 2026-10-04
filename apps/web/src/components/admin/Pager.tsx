import { adminCopy } from "@/config/admin";

const copy = adminCopy.pager;

/** Prev/next for the API's `{ items, total, page, pageSize }` lists. */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label={copy.label} className="mt-4 flex items-center justify-between gap-3 text-[0.86rem] text-muted">
      <span>{copy.summary(from, to, total)}</span>
      <span className="flex gap-2">
        <button type="button" className="btn btn-ghost px-3 py-1.5 text-[0.86rem]" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {copy.prev}
        </button>
        <button type="button" className="btn btn-ghost px-3 py-1.5 text-[0.86rem]" disabled={to >= total} onClick={() => onPage(page + 1)}>
          {copy.next}
        </button>
      </span>
    </nav>
  );
}
