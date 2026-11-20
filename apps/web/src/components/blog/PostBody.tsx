import { Info } from "lucide-react";
import type { Block } from "@/lib/blog";
import { InlineCta } from "./BlogCta";
import { Inline } from "./Inline";

/** Article text. Styles live here so the Markdown files stay plain. */
export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[1.06rem] leading-[1.75] text-muted">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} id={b.id} className="mb-3 mt-11 scroll-mt-24 font-serif text-[clamp(1.45rem,2.4vw,1.8rem)] leading-[1.2] font-semibold text-ink">
                {b.text}
              </h2>
            );
          case "h3":
            return <h3 key={i} id={b.id} className="mb-2 mt-7 scroll-mt-24 text-[1.14rem] font-bold text-ink">{b.text}</h3>;
          case "p":
            return <p key={i} className="mb-4"><Inline text={b.text} /></p>;
          case "ul":
          case "ol": {
            const List = b.type;
            return (
              <List key={i} className={`mb-5 space-y-2 pl-5 marker:text-brand ${b.type === "ul" ? "list-disc" : "list-decimal marker:font-semibold"}`}>
                {b.items.map((item) => <li key={item} className="pl-1"><Inline text={item} /></li>)}
              </List>
            );
          }
          case "note":
            return (
              <p key={i} className="my-6 flex gap-3 rounded-xl border-l-4 border-brand bg-brand-tint/60 p-4 text-[0.98rem] text-ink">
                <Info size={19} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
                <span><Inline text={b.text} /></span>
              </p>
            );
          case "table":
            return (
              <div key={i} className="my-6 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[420px] border-collapse text-left text-[0.95rem]">
                  <thead className="bg-surface-2 text-ink">
                    <tr>{b.head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-line bg-white">
                        {r.map((c, ci) => <td key={ci} className="px-4 py-3 tabular-nums"><Inline text={c} /></td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "cta":
            return <InlineCta key={i} />;
        }
      })}
    </div>
  );
}
