import Link from "next/link";

const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

/** Renders **bold** and [links](/path) inside article text. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(part);
        if (bold) return <strong key={i} className="font-semibold text-ink">{bold[1]}</strong>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (!link) return part;
        const [, label, href] = link;
        const cls = "font-medium text-brand underline underline-offset-[3px] hover:text-brand-dark";
        return href.startsWith("/") ? (
          <Link key={i} href={href} className={cls}>{label}</Link>
        ) : (
          <a key={i} href={href} target="_blank" rel="noopener" className={cls}>{label}</a>
        );
      })}
    </>
  );
}
