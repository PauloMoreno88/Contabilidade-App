import Link from "next/link";
import { hero } from "@/config/site";
import { formatBRL } from "@/lib/format";

export function Hero() {
  const p = hero.preview;
  return (
    <section id="inicio" className="relative overflow-hidden pb-[72px] pt-[140px] md:pb-24 md:pt-[168px]">
      <div className="container-x grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
        <div>
          <h1 className="max-w-[620px] text-[clamp(2.1rem,4.6vw,3.4rem)] font-semibold leading-[1.12] tracking-tight">
            {hero.title}
          </h1>
          <p className="mb-8 mt-5 max-w-[520px] text-[1.08rem] text-muted">{hero.lede}</p>
          <div className="flex flex-wrap gap-3.5">
            <Link href={hero.primaryCta.href} className="btn btn-primary">{hero.primaryCta.label}</Link>
            <Link href={hero.secondaryCta.href} className="btn btn-ghost">{hero.secondaryCta.label}</Link>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-[0.85rem] text-faint">
            {hero.trust.map((t) => (
              <li key={t.label}>
                <strong className="font-mono text-ink tabular-nums">{t.value}</strong> {t.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative preview of the simulator. */}
        <div aria-hidden="true" className="rounded-[20px] border border-line bg-surface p-[26px] shadow-[0_30px_60px_-30px_rgba(16,32,43,0.18)]">
          <div className="mb-[18px] flex items-center justify-between text-[0.76rem] text-faint">
            <span>{p.title}</span>
            <span className="font-mono">{p.step}</span>
          </div>
          <div className="mb-[22px] h-1 overflow-hidden rounded bg-surface-3">
            <i className="block h-full w-2/5 rounded bg-brand" />
          </div>
          <div className="mb-3.5 text-[0.98rem]">{p.question}</div>
          <div className="mb-[22px] flex flex-col gap-2">
            {p.options.map((o, i) => (
              <div
                key={o}
                className={`rounded-lg border px-3.5 py-2.5 text-[0.86rem] ${i === p.activeOption ? "border-brand bg-brand/5 text-ink" : "border-line text-muted"}`}
              >
                {o}
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-[18px]">
            <div className="text-[0.76rem] text-faint">{p.resultLabel}</div>
            <div className="mt-1 font-mono text-[1.9rem] font-semibold tabular-nums">
              {formatBRL(p.resultValueCents)}
              <small className="text-base font-normal text-faint">{p.perMonth}</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
