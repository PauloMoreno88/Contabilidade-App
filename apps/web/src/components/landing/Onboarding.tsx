import { FileText } from "lucide-react";
import { onboarding } from "@/config/site";
import { SectionHead } from "./SectionHead";
import { StepList } from "./StepList";

export function Onboarding() {
  return (
    <section id="onboarding" className="py-[72px] md:py-[88px]">
      <div className="container-x grid gap-9 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
        <div>
          <SectionHead title={onboarding.title} sub={onboarding.sub} />
          <StepList steps={onboarding.steps} />
        </div>
        <div>
          <h3 className="mb-4 text-[1.05rem] font-semibold">{onboarding.docsTitle}</h3>
          <ul className="flex flex-col gap-2.5">
            {onboarding.docs.map((d) => (
              <li key={d} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 text-[0.9rem] text-muted">
                <FileText className="shrink-0 text-brand" size={18} strokeWidth={1.4} aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-3.5 text-[0.8rem] text-faint">{onboarding.docsNote}</p>
        </div>
      </div>
    </section>
  );
}
